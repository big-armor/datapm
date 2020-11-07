export REGISTRY_URL="http://localhost:4200"
export REGISTRY_NAME="DataPM Local Development"
export REGISTRY_HOSTNAME="localhost"
export REGISTRY_PORT="4200"
export JWT_AUDIENCE="localhost"
export JWT_ISSUER="localhost"
export JWT_KEY="!!!!REPLACE_ME!!!"
# export APOLLO_KEY="service:service-name:asdfasdfasdfasdf"
export APOLLO_GRAPH_VARIANT="dev"
export GCLOUD_STORAGE_BUCKET_NAME="media"
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

# Examples
# export GOOGLE_APPLICATION_CREDENTIALS=/my-path/datapm-registry/gc.json
# export STORAGE_URL="file:///~/datapm-storage" # - File storage url example
# export STORAGE_URL="gs://datapm-test-bucket" # Google cloud storage example
