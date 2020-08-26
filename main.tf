resource "google_project" "project" {
  name       = "datapm TEST"
  project_id = "datapm-test-terraform"
  org_id     = "933169977231"
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
          name  = "APOLLO_KEY"
          value = "service:family-connections:asdfasdfasdfasdf"
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
          name  = "GRAPHQL_CONTEXT_USER_SUB"
          value = "auth0|adsfasdfasdfasdf"
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
          name  = "SENDGRID_API_KEY"
          value = "asdfasdfa"
        }
        env {
          name  = "GOOGLE_LOGIN_CLIENT_ID"
          value = "832769547626-tnldssk3ljco2icmss266tnn5epalheb.apps.googleusercontent.com"
        }
        env {
          name  = "GOOGLE_LOGIN_SECRET"
          value = "p1YiHnsuBMHcyltiWL_1h5yt"
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


resource "random_password" "dbpassword" {
  length           = 16
  special          = true
  override_special = "_%@"
}

resource "google_sql_database_instance" "instance" {
  name             = "registry-v2"
  project          = google_project.project.project_id
  region           = "us-central1"
  database_version = "POSTGRES_12"
  settings {
    tier = "db-f1-micro"
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
