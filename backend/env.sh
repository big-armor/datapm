# This is the port on which the server should listen. Note that depending
# on your environment, this is not necessarily the same port in the REGISTRY_URL
# below. 
export PORT=${PORT:=4000}

# The URL at which the registry should be accessed (not necessarily
# port on which the backend is hosted.)
export REGISTRY_URL=${REGISTRY_URL:="http://localhost:4200"}

# The user friendly name for this registry.
export REGISTRY_NAME=${REGISTRY_NAME:="DataPM Local Development"}

# You should replace the JWT_KEY value with a random string. 
# NEVER SHARE THE JWT KEY, IT IS A SECRET
export JWT_KEY=${JWT_KEY:="!!!!REPLACE_ME_AND_KEEP_SECRET!!!"}

# ENCRYPTION_ENGINE Currently only supports nodejs, will in the future
# support Google Cloud Key Management System (KMS), and others
export ENCRYPTION_ENGINE="nodejs"

# NODEJS_ENCRYPTION_KEY Used only when ENCRYPTION_ENGINE is set to nodejs
export NODEJS_ENCRYPTION_KEY="!!!!REPLACE_ME_AND_KEEP_SECRET!!!!!"

# TYPEORM is the libray used to communicate with the PostgreSQL database
export TYPEORM_PORT=${TYPEORM_PORT:=5432}
export TYPEORM_DATABASE=${TYPEORM_DATABASE:="datapm"}
export TYPEORM_SCHEMA=${TYPEORM_SCHEMA:="public"}
export TYPEORM_USERNAME=${TYPEORM_USERNAME:="postgres"}
export TYPEORM_PASSWORD=${TYPEORM_PASSWORD:="postgres"}

# SMTP information is necessary for sending emails such as 
# welcome, forgot password, data change notifications, etc
export SMTP_SERVER=${SMTP_SERVER:=localhost}
export SMTP_PORT=${SMTP_PORT:=25}
export SMTP_USER=${SMTP_USER}
export SMTP_PASSWORD=${SMTP_PASSWORD}
export SMTP_FROM_NAME=${SMTP_FROM_NAME:="Localhost DataPM Registry"}
export SMTP_FROM_ADDRESS=${SMTP_FROM_ADDRESS:="test@localhost"}
export SMTP_SECURE=${SMTP_SECURE:="false"}

# Where to store package files, data, user images, etc.
export STORAGE_URL=${STORAGE_URL:="file://tmp-registry-server-storage"}

export ALLOW_WEB_CRAWLERS=${ALLOW_WEB_CRAWLERS:="false"}

# Other file storage examples Examples
# export STORAGE_URL="file://~/datapm-storage" # - File storage url example
# export STORAGE_URL="gs://datapm-test-bucket" # Google cloud storage example

# SCHEDULER_KEY is only necessary for short lived instance environments (like aws lambda and google-cloud-run)
# where an outside service must be used to invoke the instance to run scheduled services
# This is an alternative to the leader election solution below
# export SCHEDULER_KEY=${SCHEDULER_KEY:="!!!!REPLACE_ME!!!!"}

# LEADER_ELECTION_DISABLED (default false) allows you to disable starting and running the leader election service,
# for leader election. Leader election is necessary for long lived instance environments 
# where leader election, even for a single instance, must occur for scheduled jobs
# to be executed. It should be disabled in short lived instances (aws lambda, google cloud run)
# This is an alternative to the SCHEDULER_KEY solution above. 
# export LEADER_ELECTION_DISABLED=${LEADER_ELECTION_DISABLED:=false}

# GOOGLE_CLOUD_PROJECT is the project id of the google cloud project that datapm registry
# is hosted in. This is only necessary when running in google cloud.
# export GOOGLE_CLOUD_PROJECT="adsfasdf"

# In the future, DataPM will support user event tracking through mixpanel
# for analytics.
# export MIXPANEL_TOKEN="not-set"

