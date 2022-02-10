/* PROTECT THE CONTENTS OF THIS FILE
Never share it publicly. */

######################
# Required
# The following variables do not have default values
# And must be set correctly
############################

/* Needs to be a bucket that already exists
 will be used to store terraform state
including secrets! This bucket should be highly secured */
terraform_state_bucket = "<your-terraform-state-bucket>"

/* Needs to be an established billing account */
gcp_billing_account_id = "<your-gcp-billing-account-id>"

/* The desired or existing project-id for hosting the resources */
gcp_project_id = "<your-gcp-project-id>"

/* The GCP location where the registry will be created
 Not all regions may support all necesssary services */
gcp_location = "us-central1"

/* The user friendly name for this registry
 Will be used through out the UI */
datapm_registry_name = "My DataPM Registry"

/* 
This is used only as a label during deployment
and not by the datapm server itself. You can host 
more than one datapm server in the same terraform statebucket
and gcp project by changing this value.

Should should only use characters [a-z,0-9,_,-] */
datapm_environment = "test"

/* This is the domain name that will be mapped to the 
google cloud run service. You should have the ability
modify DNS as required by google cloud run. */
datapm_domain_name = "datapm.company.com"

/* SMTP relay sending information. You can use Google Workspace, MailChip, SendGrid, 
or many others. */
smtp_host       = "smtp.sendgrid.net"
smtp_password   = "password"
smtp_port       = 465
smtp_user       = "apikey"
smtp_from_name  = "DataPM Support"
smtp_from_email = "support@datapm.io"
smtp_secure     = true

###################
# Optional
###################
/* The following variables have default values
You can uncomment these to override them */

# gcp_sql_tier = "db-f1-micro"

# media_bucket_name = "datapm-<environment>-media"

# log_bucket_name = "datapm-<environment>-logging"

/* DataPM Registry will in the future support
sending activity events to MixPanel for user
enagement analytics and troubleshooting */
# mixpanel_token = "not-set"

/* Whether to enable user activity logging, default true */
# datapm_enable_activity_log = true
