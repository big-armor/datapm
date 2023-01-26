variable "datapm_environment" {
  description = "Name of the environment (test, staging, production, etc.)"
  type        = string
}

variable "gcp_billing_account_id" {
  description = "Billing account ID for the GCP project"
  type        = string
}

variable "smtp_password" {
  description = "password for the SMTP server"
  type        = string
  sensitive   = true
}

variable "smtp_from_name" {
  description = "name of the sender"
  type        = string
}

variable "smtp_from_email" {
  description = "email of the sender"
  type        = string
}

variable "smtp_secure" {
  description = "whether to use TLS or not"
  type        = bool
}

variable "allow_web_crawlers" {
  description = "whether to enable robots.txt"
  type        = bool
  default     = false
}

variable "smtp_host" {
  description = "hostname for the SMTP server"
  type        = string
}

variable "smtp_port" {
  description = "port for the SMTP server"
  type        = number
  default     = 25
}

variable "smtp_user" {
  description = "user for the SMTP server"
  type        = string
}

variable "gcp_location" {
  description = "location of the GCP project (us-central1, us-east1, etc)"
  type        = string
}

variable "datapm_registry_name" {
  description = "name of the registry"
  type        = string
}

variable "gcp_project_id" {
  description = "GCP project ID to host the registry"
  type        = string
}

variable "mixpanel_token" {
  description = "Mixpanel.com token for the project"
  type        = string
  sensitive   = true
  default     = "not-set" # This will disable mixpanel sending
}

variable "datapm_domain_names" {
  description = "Domain name for the datapm registry server"
  type        = list(any)
}

variable "google_sql_name" {
  description = "Name of the Google SQL instance"
  type        = string
  default     = "defaut"
}

variable "gcp_project_folder" {
  description = "Name of the Google project folder"
  type        = string
  default     = null
}

variable "gcp_sql_tier" {
  description = "Google SQL tier"
  type        = string
  default     = "db-f1-micro"
}

terraform {
  backend "gcs" {}

  required_providers {
    google = {
      version = "~> 4.10.0"
    }
  }
}

data "google_billing_account" "acct" {
  billing_account = var.gcp_billing_account_id
  open            = true
}

resource "google_project" "project" {
  name            = var.datapm_registry_name
  project_id      = var.gcp_project_id
  billing_account = data.google_billing_account.acct.id
  folder_id       = var.gcp_project_folder
  lifecycle {
    prevent_destroy = true
  }
}

resource "google_project_service" "service" {
  for_each = toset([
    "clouddebugger.googleapis.com",
    "cloudresourcemanager.googleapis.com",
    "datastore.googleapis.com",
    "storage-component.googleapis.com",
    "container.googleapis.com",
    "storage-api.googleapis.com",
    "logging.googleapis.com",
    "resourceviews.googleapis.com",
    "replicapool.googleapis.com",
    "replicapoolupdater.googleapis.com",
    "cloudapis.googleapis.com",
    "deploymentmanager.googleapis.com",
    "cloudbilling.googleapis.com",
    "containerregistry.googleapis.com",
    "sqladmin.googleapis.com",
    "monitoring.googleapis.com",
    "compute.googleapis.com",
    "sql-component.googleapis.com",
    "iam.googleapis.com",
    "cloudtrace.googleapis.com",
    "servicemanagement.googleapis.com",
    "run.googleapis.com",
    "dns.googleapis.com",
    "cloudscheduler.googleapis.com",
  ])

  service = each.key

  project            = google_project.project.project_id
  disable_on_destroy = false
}

resource "google_service_account" "cloudrun-sa" {
  account_id = "cloudrun-sa"
  project    = google_project.project.project_id
  depends_on = [google_project_service.service]
}

resource "google_project_iam_member" "cloudrun-sa-cloudsql-role" {
  project = google_project.project.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudrun-sa.email}"
}

resource "google_storage_bucket" "logging" {
  name          = "datapm-${var.datapm_environment}-logs-${google_project.project.project_id}"
  location      = var.gcp_location
  force_destroy = false
  project       = google_project.project.project_id

  lifecycle_rule {
    condition {
      age        = 365
      with_state = "ANY"
    }
    action {
      type = "Delete"
    }
  }
}

resource "google_storage_bucket" "media" {
  name          = "datapm-${var.datapm_environment}-media-${google_project.project.project_id}"
  location      = var.gcp_location
  force_destroy = false
  project       = google_project.project.project_id

  logging {
    log_bucket        = google_storage_bucket.logging.name
    log_object_prefix = "media"
  }

}


resource "google_storage_bucket_acl" "media-store-acl" {
  bucket = google_storage_bucket.media.name

  role_entity = [
    "OWNER:user-${google_service_account.cloudrun-sa.email}"
  ]
}


resource "google_cloud_run_service" "default" {
  name     = "datapm-registry-${var.datapm_environment}"
  location = var.gcp_location
  project  = google_project.project.project_id
  template {
    spec {
      service_account_name = google_service_account.cloudrun-sa.email
      containers {
        image = "gcr.io/datapm-containers/datapm-registry"
        env {
          name  = "NODE_ENV"
          value = "production"
        }
        env {
          name  = "JWT_KEY"
          value = random_password.jwt_key.result
        }
        env {
          name = "NODEJS_ENCRYPTION_KEY"
          value = random_password.nodejs_encryption_key.result
        }
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = google_project.project.project_id
        }
        env {
          name  = "MIXPANEL_TOKEN"
          value = var.mixpanel_token
        }
        env {
          name  = "TYPEORM_HOST"
          value = "/cloudsql/${google_project.project.project_id}:${google_sql_database_instance.instance.region}:${google_sql_database_instance.instance.name}"
        }
        env {
          name  = "TYPEORM_PORT"
          value = "5432"
        }
        env {
          name  = "TYPEORM_DATABASE"
          value = google_sql_database.database.name
        }
        env {
          name  = "TYPEORM_SCHEMA"
          value = "public"
        }
        env {
          name  = "TYPEORM_USERNAME"
          value = google_sql_user.user.name
        }
        env {
          name  = "TYPEORM_PASSWORD"
          value = google_sql_user.user.password
        }
        env {
          name  = "REGISTRY_NAME"
          value = var.datapm_registry_name
        }
        env {
          name  = "REGISTRY_URL"
          value = "https://${var.datapm_domain_names[0]}"
        }

        env {
          name  = "SMTP_SERVER"
          value = var.smtp_host
        }
        env {
          name  = "SMTP_PORT"
          value = var.smtp_port
        }
        env {
          name  = "SMTP_USER"
          value = var.smtp_user
        }
        env {
          name  = "SMTP_PASSWORD"
          value = var.smtp_password
        }
        env {
          name  = "SMTP_FROM_NAME"
          value = var.smtp_from_name
        }
        env {
          name  = "SMTP_FROM_ADDRESS"
          value = var.smtp_from_email
        }
        env {
          name  = "SMTP_SECURE"
          value = var.smtp_secure
        }

        env {
          name  = "ALLOW_WEB_CRAWLERS"
          value = var.allow_web_crawlers
        }
        env {
          name  = "STORAGE_URL"
          value = "gs://${google_storage_bucket.media.name}"
        }

        env {
          name  = "SCHEDULER_KEY"
          value = random_password.scheduler_key.result
        }
        env {
          ## Leader election must be disabled for google cloud run
          ## google cloud cron jobs are used instead
          name  = "LEADER_ELECTION_DISABLED"
          value = "true"
        }
      }
    }

    metadata {
      namespace = google_project.project.project_id
      annotations = {
        "autoscaling.knative.dev/minScale"      = "1"
        "autoscaling.knative.dev/maxScale"      = "2"
        "run.googleapis.com/cloudsql-instances" = "${google_project.project.project_id}:${google_sql_database_instance.instance.region}:${google_sql_database_instance.instance.name}"
        "run.googleapis.com/client-name"        = "terraform"
      }
    }
  }
  autogenerate_revision_name = true
}

data "google_iam_policy" "noauth" {
  binding {
    role = "roles/run.invoker"
    members = [
      "allUsers"
    ]
  }
}

resource "google_cloud_run_service_iam_policy" "noauth" {
  location = google_cloud_run_service.default.location
  project  = google_cloud_run_service.default.project
  service  = google_cloud_run_service.default.name

  policy_data = data.google_iam_policy.noauth.policy_data
}

resource "random_password" "scheduler_key" {
  length           = 16
  special          = true
  override_special = "_%@"
}

resource "random_password" "jwt_key" {
  length           = 16
  special          = true
  override_special = "_%@"
}

resource "random_password" "nodejs_encryption_key" {
  length           = 16
  special          = true
  override_special = "_%@"
}
resource "random_password" "dbpassword" {
  length           = 16
  special          = true
  override_special = "_%@"
}

resource "google_sql_database_instance" "instance" {
  name             = "datapm-registry-${var.datapm_environment}"
  project          = google_project.project.project_id
  region           = var.gcp_location
  database_version = "POSTGRES_13"
  settings {
    tier              = var.gcp_sql_tier
    availability_type = "REGIONAL"
    backup_configuration {
      enabled                        = true
      start_time                     = "01:00"
      point_in_time_recovery_enabled = true
    }

    ip_configuration {
      require_ssl = false
    }
  }

  lifecycle {
    prevent_destroy = true
  }
}

resource "google_sql_user" "user" {
  depends_on = [
    google_sql_database_instance.instance
  ]

  name     = "postgres"
  project  = google_project.project.project_id
  instance = google_sql_database_instance.instance.name
  password = random_password.dbpassword.result
}

resource "google_sql_database" "database" {
  name     = "public"
  instance = google_sql_database_instance.instance.name
  project  = google_project.project.project_id
}
resource "google_cloud_run_domain_mapping" "default" {

  for_each = toset(var.datapm_domain_names)

  location = var.gcp_location
  name     = each.value
  project  = google_project.project.project_id

  metadata {
    namespace = google_project.project.project_id
  }

  spec {
    route_name = google_cloud_run_service.default.name
  }
}


resource "google_cloud_scheduler_job" "instant_notifications_job" {
  depends_on       = [google_project_service.service]
  name             = "datapm-${var.datapm_environment}-instant-notifications"
  project          = google_project.project.project_id
  region           = var.gcp_location
  description      = "To invoke sending daily notifications"
  schedule         = "* * * * *"
  time_zone        = "America/New_York"
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://${var.datapm_domain_names[0]}/graphql"
    headers = {
      Content-Type = "application/json"
    }
    body = base64encode("{\"operationName\":\"runJob\",\"variables\":{\"key\":\"${random_password.scheduler_key.result}\",\"job\":\"INSTANT_NOTIFICATIONS\"},\"query\":\"mutation runJob($key: String!, $job: JobType!) { runJob(key: $key, job: $job)}\"}")
  }
}

resource "google_cloud_scheduler_job" "hourly_notifications_job" {
  depends_on       = [google_project_service.service]
  name             = "datapm-${var.datapm_environment}-hourly-notifications"
  project          = google_project.project.project_id
  region           = var.gcp_location
  description      = "To invoke sending hourly notifications"
  schedule         = "0 * * * *"
  time_zone        = "America/New_York"
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://${var.datapm_domain_names[0]}/graphql"
    headers = {
      Content-Type = "application/json"
    }
    body = base64encode("{\"operationName\":\"runJob\",\"variables\":{\"key\":\"${random_password.scheduler_key.result}\",\"job\":\"HOURLY_NOTIFICATIONS\"},\"query\":\"mutation runJob($key: String!, $job: JobType!) { runJob(key: $key, job: $job)}\"}")
  }
}

resource "google_cloud_scheduler_job" "daily_notifications_job" {
  depends_on       = [google_project_service.service]
  name             = "datapm-${var.datapm_environment}-daily-notifications"
  project          = google_project.project.project_id
  region           = var.gcp_location
  description      = "To invoke sending daily notifications"
  schedule         = "0 8 * * *"
  time_zone        = "America/New_York"
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://${var.datapm_domain_names[0]}/graphql"
    headers = {
      Content-Type = "application/json"
    }
    body = base64encode("{\"operationName\":\"runJob\",\"variables\":{\"key\":\"${random_password.scheduler_key.result}\",\"job\":\"DAILY_NOTIFICATIONS\"},\"query\":\"mutation runJob($key: String!, $job: JobType!) { runJob(key: $key, job: $job)}\"}")
  }
}



resource "google_cloud_scheduler_job" "weekly_notifications_job" {
  depends_on       = [google_project_service.service]
  name             = "datapm-${var.datapm_environment}-weekly-notifications"
  project          = google_project.project.project_id
  region           = var.gcp_location
  description      = "To invoke sending weekly notifications"
  schedule         = "0 8 * * MON"
  time_zone        = "America/New_York"
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://${var.datapm_domain_names[0]}/graphql"
    headers = {
      Content-Type = "application/json"
    }
    body = base64encode("{\"operationName\":\"runJob\",\"variables\":{\"key\":\"${random_password.scheduler_key.result}\",\"job\":\"WEEKLY_NOTIFICATIONS\"},\"query\":\"mutation runJob($key: String!, $job: JobType!) { runJob(key: $key, job: $job)}\"}")
  }
}


resource "google_cloud_scheduler_job" "monthly_notifications_job" {
  depends_on       = [google_project_service.service]
  name             = "datapm-${var.datapm_environment}-monthly-notifications"
  project          = google_project.project.project_id
  region           = var.gcp_location
  description      = "To invoke sending monthly notifications"
  schedule         = "0 8 1 * *"
  time_zone        = "America/New_York"
  attempt_deadline = "320s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://${var.datapm_domain_names[0]}/graphql"
    headers = {
      Content-Type = "application/json"
    }
    body = base64encode("{\"operationName\":\"runJob\",\"variables\":{\"key\":\"${random_password.scheduler_key.result}\",\"job\":\"MONTHLY_NOTIFICATIONS\"},\"query\":\"mutation runJob($key: String!, $job: JobType!) { runJob(key: $key, job: $job)}\"}")
  }
}



resource "google_cloud_scheduler_job" "package_updates" {
  depends_on       = [google_project_service.service]
  name             = "datapm-${var.datapm_environment}-pacakge-updates"
  project          = google_project.project.project_id
  region           = var.gcp_location
  description      = "To invoke updating packages"
  schedule         = "0 * * * *"
  time_zone        = "America/New_York"
  attempt_deadline = "62s"

  retry_config {
    retry_count = 1
  }

  http_target {
    http_method = "POST"
    uri         = "https://${var.datapm_domain_names[0]}/graphql"
    headers = {
      Content-Type = "application/json"
    }
    body = base64encode("{\"operationName\":\"runJob\",\"variables\":{\"key\":\"${random_password.scheduler_key.result}\",\"job\":\"PACKAGE_UPDATE\"},\"query\":\"mutation runJob($key: String!, $job: JobType!) { runJob(key: $key, job: $job)}\"}")
  }
}

