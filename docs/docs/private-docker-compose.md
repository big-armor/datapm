---
id: private-registry-docker-compose
title: Host A Private DataPM Registry
sidebar_label: Docker Compose
---

You can host your own DataPM registry for private or public use. Be sure to understand the following:

-   Read the [DataPM License](license.md)

## Hosting via Docker Compose

[Docker compose](https://docs.docker.com/compose/) is the simplest method to deploy a DataPM Registry. The solution below deploys the registry server, the database, and the SMTP (email) server.

Start by copying the contents of this file into a new file named "datapm-docker-compose.yml".

```text
version: "3.7"

volumes:
  postgres_data_local: {}
  registry_file_store: {}

services:
  datapm-registry:
    image: datapm/datapm-registry:latest
    ports:
      - "4000:4000"
    volumes:
      - type: volume
        source: registry_file_store
        target: /var/lib/datapm-registry/data
        consistency: cached
    environment:
      - REGISTRY_NAME=Private DataPM Registry
      - REGISTRY_URL=http://localhost:4000
      - NODEJS_ENCRYPTION_KEY=!!!!REPLACE_ME!!!
      - JWT_KEY=!!!!REPLACE_ME!!!
      - STORAGE_URL=file://var/lib/datapm-registry/data
      - TYPEORM_PORT=5432
      - TYPEORM_HOST=postgres
      - TYPEORM_DATABASE=postgres
      - TYPEORM_SCHEMA=public
      - TYPEORM_USERNAME=postgres
      - TYPEORM_PASSWORD=postgres
      - SMTP_SERVER=smtp
      - SMTP_PORT=25
      - SMTP_USER=
      - SMTP_PASSWORD=
      - SMTP_FROM_NAME=Localhost DataPM Registry
      - SMTP_FROM_ADDRESS=datapm@localhost
      - SMTP_SECURE=false
      - ALLOW_WEB_CRAWLERS=false
  postgres:
    image: postgres:13.3
    volumes:
      - type: volume
        source: postgres_data_local
        target: /var/lib/postgresql/data
        consistency: delegated
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_HOST=postgres
      - POSTGRES_PORT=5432
      - POSTGRES_DB=datapm
      - POSTGRES_USER=postgres
      - POSTGRES_PASSWORD=postgres
  smtp:
    image: namshi/smtp:latest
    environment:
        - RELAY_NETWORKS=:0.0.0.0/0


```

Next run the following docker-compose command. Reference the filename you created above.

```text
docker-compose -f datapm-docker-compose.yml up
```

DataPM Registry should now be running on port 4000.

Open a web browser and go to http://localhost:4000.

The first user account created will be made an administrator.
