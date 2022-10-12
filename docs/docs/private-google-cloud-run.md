---
id: private-registry-google-cloud-run
title: Host DataPM Registry in Google Cloud Run
---

[Google Coud Run](https://cloud.google.com/run) (GCR) can be used to host a public or private DataPM registry.

You can host your own DataPM registry for private or public use. Be sure to understand the following:

-   Read the [DataPM License](license.md)

## Advantages

1. GCR is very cost efficient.
1. GCR is extremely performance scalable.
1. GCR is a very secure platform.
1. GCR is serverless, and therefore operational maintenance is relatively low.
1. [datapm.io](https://datapm.io) is hosted on GCR, and therefore hosting on GCR is highly tested.
1. Deployment to GCR can be automated using DataPM's ready to go Terraform scripts.
    - Includes Postgres Database
    - Does not include SMTP mail server

## Challenges

1. GCR is a serverless platform that is not as widely known as other cloud platforms.
    - You will need to be familiar with GCR
    - Operating GCR is very different than other cloud platforms
1. GCR limits a single HTTP connection lifetime to 60 minutes, and therefore may not be suitable for storing some continuously streaming or very large data sets.

## WARNING

This guide and the resources it provides are intended as a helpful starter. These resources are not garunteed to produce a 100% secure deployment of DataPM. You should be cautious. Review and apply GCP's security best practices documentation before, during, and continuously after using this guide.

By using this guide, you agree to the [DataPM License](https://datapm.io/docs/license) and the liability limitations therein.

### Install Terraform Command Line Client

1. [Install Terraform Command Line Client](https://learn.hashicorp.com/tutorials/terraform/install-cli)
    - MacOS [Homebrew](https://brew.sh/): `brew install terraform`

### Prepare Google Cloud Resources

1. Open the [GCP Console](https://console.cloud.google.com) with your Google Account
1. Create a GCP [billing account](https://cloud.google.com/billing/docs/how-to/manage-billing-account)
    - You may already have an active billing account
1. (Optional) Create a new [project folder](https://cloud.google.com/resource-manager/docs/creating-managing-folders) in your GCP organization
    - All datapm projects will be placed in this folder
    - You can then share access to GCP resources at the folder level
1. [Create a GCP project](https://cloud.google.com/resource-manager/docs/creating-managing-projects).
    - (optional) Place this project in the "datapm" folder you created above
    - You will need to [enable billing](https://cloud.google.com/billing/docs/how-to/modify-project) for the project
    - It is highly recommended to create a new separate project for each instance of DataPM
1. Create a [GCP Storage Bucket](https://cloud.google.com/storage/docs/creating-buckets) that will be used to hold the terraform state
    - Example name "<company-name>-datapm-<environment>-state"
    - Enable public access restriction policy
    - Use multiple regions to ensure failover
    - Use standard storage class
    - Enable version retentions with about 5 versions retained for at least 7 days

### Local Google Cloud Authentication

Use one of the options below to set gcloud authentication for use by the Terraform command.

#### Authentication Option 1: Use GCloud Application Default Credentials

1. Use the following command to set your [glcoud application default credentilas](https://cloud.google.com/sdk/gcloud/reference/auth/application-default/login) - which are used by the Terraform Commands below.
    - Note: this may affect any other google cloud related applications you are using from the command line.
    - `gcloud auth application-default login`
1. Be sure to unset/delete the GOOGLE_APPLICATION_CREDENTIALS environment variable, because it would override the above credentials.
    - Linux and MacOS: `unset GOOGLE_APPLICATION_CREDENTIALS`
    - Windows: `$env:GOOGLE_APPLICATION_CREDENTIALS=''`

#### Authentication Option 2: Use GCP Service Account Credentials

1. Create a [GCP service account](https://cloud.google.com/iam/docs/creating-managing-service-accounts) for deployments
    - This service account will be used to deploy the GCP resources
    - Give it the "Owner" role
        - This is highly over provisioned, and should be trimmed down
1. Create a [service account key](https://cloud.google.com/iam/docs/creating-managing-service-account-keys) and download a JSON copy of it
    - This key file will be used during the terraform deployment process
    - You should protect this file, and never check it into source control.
1. Set your local `GOOGLE_APPLICATION_CREDENTIALS` environment variable to the path of the key file
    - Linux and MacOS `export GOOGLE_APPLICATION_CREDENTIALS=<path>`
    - Windows `$env:GOOGLE_APPLICATION_CREDENTIALS="<path>"`
1. Add the new service account as a Billing Account Principal
    - Give it the "Billing Account Viewer" role

### Download and Prepare Terraform Files

1. Download the [DataPM GCP Terraform Scripts](/static/terraform-scripts/gcp).
    - You will need to periodically download new versions of the script as they are updated.
1. Rename and modify the environment-example.tvars file
    - Reffer to [Terraform's Protecting Secrets documentation](https://learn.hashicorp.com/tutorials/terraform/sensitive-variables)
1. Rename and modify the backend-example.config file
    - The bucket is the name of the Google Cloud Storage bucket you created above.

### Run Terraform Commands

1. Open a terminal and "cd" into the directory with the scripts
1. Run the `terraform init --backend-config="backend.config"` command.
1. Run the `terraform import -var-file="environment.tfvars" google_project.project <google-project-id>` command.
    - This will import the existing GCP project into the Terraform state
1. Run the `terraform plan -var-file="environment.tfvars"` command.
    - Be sure to review the output for changes and errors
1. Run the `terraform apply -var-file="environment.tfvars"` command.
    - The SQL server can take up to 30 minutes to deploy
    - The domain certificate will be provisioned immediately, but will take up to 30 minutes to become active
    - The GCP global load balancers will return a "Server Error" until the certificate is active
1. You can modify the terraform files, and re-run the terraform plan and apply commands above.

## Ongoing Maintenance

1. Periodically return to this page to [download the latest DataPM GCP Terraform Scripts](/static/terraform-scripts/gcp).
1. Setup [Google Cloud Security Command Center](https://cloud.google.com/security-command-center) to monitor the GCP resources you created.
