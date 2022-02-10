
######################
# Required
# The following variables do not have default values
# And must be set correctly
############################

/* Needs to be an established billing account */
gcp_billing_account_id = "01FAC5-979F7E-18046B"

gcp_project_folder = "237521069674"

/* The desired or existing project-id for hosting the resources */
gcp_project_id = "datapm-test-v4"

/* The GCP location where the registry will be created
 Not all regions may support all necesssary services */
gcp_location = "us-central1"

/* The user friendly name for this registry
 Will be used through out the UI */
datapm_registry_name = "DataPM Test"

/* Should should only use characters [a-z,0-9,_,-] */
datapm_environment = "test"

/* This is the domain name that will be mapped to the 
google cloud run service. You should have the ability
modify DNS as required by google cloud run. */
datapm_domain_name = "test.datapm.io"

/* SMTP relay sending information. You can use Google Workspace, MailChip, SendGrid, 
or many others. */
smtp_host       = "smtp.sendgrid.net"
# smtp_password   = See TF_VARS_stmp_password in deployment config
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

/* DataPM Registry will in the future support
sending activity events to MixPanel for user
enagement analytics and troubleshooting */
# mixpanel_token = "not-set"

## Whether to enable user activity logging, default true
# datapm_enable_activity_log = true
