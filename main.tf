variable "smtp_password" {
  description = "password for the SMTP server"
  type        = string
}

variable "APOLLO_KEY" {
  description = "Apollo GraphlQL Key"
  type        = string
}

terraform {
  backend "gcs" {
    bucket = "datapm-registry-test"
    prefix = "test/state"
  }
}

data "google_billing_account" "acct" {
  display_name = "Big Armor Corporate"
  open         = true
}

resource "google_project" "project" {
  name            = "datapm TEST"
  project_id      = "datapm-test-terraform"
  billing_account = data.google_billing_account.acct.id
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
    "dns.googleapis.com"
  ])

  service = each.key

  project            = google_project.project.project_id
  disable_on_destroy = false
}

resource "google_service_account" "cloudrun-sa" {
  account_id = "cloudrun-sa"
  project    = google_project.project.project_id
}
resource "google_project_iam_member" "cloudrun-sa-cloudsql-role" {
  project = google_project.project.project_id
  role    = "roles/cloudsql.client"
  member  = "serviceAccount:${google_service_account.cloudrun-sa.email}"
}

resource "google_cloud_run_service" "default" {
  name     = "datapm-registry"
  location = "us-central1"
  project  = google_project.project.project_id
  template {
    spec {
      service_account_name = google_service_account.cloudrun-sa.email
      containers {
        image = "gcr.io/${google_project.project.project_id}/datapm-registry"
        env {
          name  = "JWT_AUDIENCE"
          value = "test.datapm.io"
        }
        env {
          name  = "JWT_ISSUER"
          value = "test.datapm.io"
        }
        env {
          name  = "JWT_KEY"
          value = random_password.jwt_key.result
        }
        env {
          name  = "APOLLO_KEY"
          value = var.APOLLO_KEY
        }
        env {
          name  = "APOLLO_GRAPH_VARIANT"
          value = "dev"
        }
        env {
          name  = "GCLOUD_STORAGE_BUCKET_NAME"
          value = "media"
        }
        env {
          name  = "GOOGLE_CLOUD_PROJECT"
          value = google_project.project.project_id
        }
        env {
          name  = "FILESYSTEM_STORAGE_DIRECTORY"
          value = "local_storage"
        }
        env {
          name  = "MIXPANEL_TOKEN"
          value = "asdfasdfasdf"
        }
        env {
          name  = "TYPEORM_HOST"
          value = "/cloudsql/${google_project.project.project_id}:us-central1:${google_sql_database_instance.instance.name}"
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
          value = "DataPM TEST Registry"
        }
        env {
          name  = "REGISTRY_HOSTNAME"
          value = "test.datapm.io"
        }
        env {
          name  = "REGISTRY_PORT"
          value = "443"
        }
        env {
          name  = "TYPEORM_IS_DIST"
          value = "true"
        }
        env {
          name  = "SMTP_SERVER"
          value = "smtp.sendgrid.net"
        }
        env {
          name  = "SMTP_PORT"
          value = "465"
        }
        env {
          name  = "SMTP_USER"
          value = "apikey"
        }
        env {
          name  = "SMTP_PASSWORD"
          value = var.smtp_password
        }
        env {
          name  = "SMTP_FROM_NAME"
          value = "DataPM Test Registry"
        }
        env {
          name  = "SMTP_FROM_ADDRESS"
          value = "support@datapm.io"
        }
        env {
          name  = "SMTP_SECURE"
          value = "true"
        }
        env {
          name  = "REQUIRE_EMAIL_VERIFICATION"
          value = "true"
        }
      }
    }

    metadata {
      namespace = google_project.project.project_id
      annotations = {
        "autoscaling.knative.dev/maxScale"      = "2"
        "run.googleapis.com/cloudsql-instances" = "${google_project.project.project_id}:us-central1:${google_sql_database_instance.instance.name}"
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

resource "random_password" "jwt_key" {
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
  name             = "registry-v3"
  project          = google_project.project.project_id
  region           = "us-central1"
  database_version = "POSTGRES_12"
  settings {
    tier = "db-f1-micro"
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
  location = "us-central1"
  name     = "test.datapm.io"
  project  = google_project.project.project_id

  metadata {
    namespace = google_project.project.project_id
  }

  spec {
    route_name = google_cloud_run_service.default.name
  }
}
