export REGISTRY_URL=${REGISTRY_URL:="http://localhost:4200"}
export REGISTRY_NAME="DataPM Local Development"
export JWT_AUDIENCE="localhost"
export JWT_ISSUER="localhost"
export JWT_KEY="!!!!REPLACE_ME!!!"

# SCHEDULER_KEY is only necessary for short lived instance environments (like aws lambda and google-cloud-run)
# where an outside service must be used to invoke the instance to run scheduled services
# This is an alternative to the leader election solution below
export SCHEDULER_KEY=${SCHEDULER_KEY:="!!!!REPLACE_ME!!!!"}

# LEADER_ELECTION_DISABLED (default false) allows you to disable starting and running the leader election service,
# for leader election. Leader election is necessary for long lived instance environments 
# where leader election, even for a single instance, must occur for scheduled jobs
# to be executed. It should be disabled in short lived instances (aws lambda, google cloud run)
# This is an alternative to the SCHEDULER_KEY solution above. 
export LEADER_ELECTION_DISABLED=false

# export APOLLO_KEY="service:service-name:asdfasdfasdfasdf"
export APOLLO_GRAPH_VARIANT="dev"
export GOOGLE_CLOUD_PROJECT="adsfasdf"
export MIXPANEL_TOKEN="asdfasdfasdf"
export TYPEORM_PORT=${TYPEORM_PORT:=5432}
export TYPEORM_DATABASE="datapm"
export TYPEORM_SCHEMA="public"
export TYPEORM_USERNAME="postgres"
export TYPEORM_PASSWORD="postgres"
export SMTP_SERVER=${SMTP_SERVER:=localhost}
export SMTP_PORT=${SMTP_PORT:=25}
export SMTP_USER=${SMTP_USER}
export SMTP_PASSWORD=${SMTP_PASSWORD}
export SMTP_FROM_NAME=${SMTP_FROM_NAME:="Localhost DataPM Registry"}
export SMTP_FROM_ADDRESS=${SMTP_FROM_ADDRESS:="test@localhost"}
export SMTP_SECURE=${SMTP_SECURE:="false"}
export STORAGE_URL=${STORAGE_URL:="file://tmp-registry-server-storage"}
export DATAPM_VERSION=${DATAPM_VERSION:=$(cat package.json | grep version | head -1 | awk -F: '{ print $2 }' | sed 's/[", ]//g')}
export ACTIVITY_LOG=true

# Examples
# export GOOGLE_APPLICATION_CREDENTIALS=/my-path/datapm-registry/gc.json
# export STORAGE_URL="file:///~/datapm-storage" # - File storage url example
# export STORAGE_URL="gs://datapm-test-bucket" # Google cloud storage example
