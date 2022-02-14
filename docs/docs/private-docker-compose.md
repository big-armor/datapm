---
id: private-registry
title: Host A Private DataPM Registry
sidebar_label: Private Registry
---

You can host your own DataPM registry for private or public use. Be sure to understand the following:

-   Read the [DataPM License](license.md)
-   DataPM is currently [Beta software](beta-notice.md).

## Hosting via Docker

Docker compose is the simplest method to deploy a DataPM Registry and supporting Postgres server. Use the following template as a start.

```text
version: "3.7"

volumes:
  postgres_data_local: {}
  registry_file_store: {}

services:
  datapm-registry:
    image: datapm-registry:latest
    ports:
      - "4000:4000"
    volumes:
      - type: volume
        source: registry_file_store
        target: /var/lib/datapm-registry/data
        consistency: cached
    environment:
      - REGISTRY_NAME="Private DataPM Registry"
      - REGISTRY_URL=http://localhost:4000
      - JWT_KEY=!!!!REPLACE_ME!!!
      - STORAGE_URL="file:///var/lib/datapm-registry/data"
      - TYPEORM_PORT=5432
      - TYPEORM_HOST=postgres
      - TYPEORM_DATABASE=postgres
      - TYPEORM_SCHEMA=public
      - TYPEORM_USERNAME=postgres
      - TYPEORM_PASSWORD=postgres
      - SMTP_SERVER=localhost
      - SMTP_PORT=25
      - SMTP_USER=
      - SMTP_PASSWORD=
      - SMTP_FROM_NAME="Localhost DataPM Registry"
      - SMTP_FROM_ADDRESS="datapm@localhost"
      - SMTP_SECURE=false
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
    ports:
        - "25:25"

```