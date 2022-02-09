---
id: private-registry-google-cloud-run
title: Host A Private DataPM Registry in Google Cloud Run
---

[Google Coud Run](https://cloud.google.com/run) (GCR) can be used to host a public or private DataPM registry. First be sure to review the advntages and challanges of using GCR below.

## Advantages

1. GCR is very cost efficient, and can even be completely free.
1. GCR is extremely performance scalable.
1. GCR is a very secure platform.
1. GCR is serverless, and therefore operational maintenance is relatively easy.
1. [datapm.io](https://datapm.io) is hosted on GCR, and therefore hosting on GCR is highly tested and reliable.
1. Deployment to GCR can be automated using DataPM's ready to go Terraform scripts.
    - Includes Postgres Database
    - Does not include SMTP mail server

## Challenges

1. GCR is a serverless platform that is not as widely known as other cloud platforms.
    - You will need to be familiar with GCR
    - Operating GCR is very different than other cloud platforms
1. GCR limits a single instance to 60 minutes, and therefore may not be suitable for storing some continuously streaming or very large data sets.

## Instructions

While these instructions are thorough, they are not complete and will require your own research and experimentation.

1. [Install Terraform Command Line Client](https://learn.hashicorp.com/tutorials/terraform/install-cli) or [Use the Terraform Cloud](https://learn.hashicorp.com/collections/terraform/cloud-get-started)
1. [Create a GCP project](https://cloud.google.com/resource-manager/docs/creating-managing-projects).
    - You will need to [enable billing](https://cloud.google.com/billing/docs/how-to/modify-project)
1. Download the [DataPM GCP Deployment Scripts](/static/terraform-scripts/gcp).
    - You will need to periodically download new versions of the script as it is updated.
1. Modify the secrets.tvars file
    - Reffer to [Terraform's Protecting Secrets documentation](https://learn.hashicorp.com/tutorials/terraform/sensitive-variables)
    - You should protect this file, and never check it into source control.
1. Create a GCP service account for deployments
    - This will be used to deploy the GCP resources
1. Create a key for the service account
    - This key file will be used during the terraform deployment process
    - You should protect this file, and never check it into source control.
1. Run the `terraform init` command.
1. Run the `terraform plan -var-file="secrets.tvars"` command.
    - Besure to review the output for changes
1. Run the `terraform apply -var-file="secrets.tvars"` command.
