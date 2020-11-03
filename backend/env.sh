export REGISTRY_URL="http://localhost:4200"
export REGISTRY_NAME="DataPM Local Development"
export REGISTRY_HOSTNAME="localhost"
export REGISTRY_PORT="4200"
export JWT_AUDIENCE="localhost"
export JWT_ISSUER="localhost"
export JWT_KEY="!!!!REPLACE_ME!!!"
export NODE_MODULES_DIRECTORY="node_modules"
# export APOLLO_KEY="service:service-name:asdfasdfasdfasdf"
export APOLLO_GRAPH_VARIANT="dev"
export GCLOUD_STORAGE_BUCKET_NAME="media"
export GOOGLE_CLOUD_PROJECT="adsfasdf"
export FILESYSTEM_STORAGE_DIRECTORY="local_storage"
export MIXPANEL_TOKEN="asdfasdfasdf"
export TYPEORM_PORT=${TYPEORM_PORT:=5432}
export TYPEORM_DATABASE="datapm"
export TYPEORM_SCHEMA="public"
export TYPEORM_USERNAME="postgres"
export TYPEORM_PASSWORD="postgres"
export REQUIRE_EMAIL_VERIFICATION=${REQUIRE_EMAIL_VERIFICATION:=true}
export SMTP_SERVER=${SMTP_SERVER:=localhost}
export SMTP_PORT=${SMTP_PORT:=25}
export SMTP_USER=${SMTP_USER}
export SMTP_PASSWORD=${SMTP_PASSWORD}
export SMTP_FROM_NAME=${SMTP_FROM_NAME:="Localhost DataPM Registry"}
export SMTP_FROM_ADDRESS=${SMTP_FROM_ADDRESS:="test@localhost"}
export SMTP_SECURE=${SMTP_SECURE:="false"}