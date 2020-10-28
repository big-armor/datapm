---
id: private-registry
title: Host A Private DataPM Registry
sidebar_label: Private Registry
---

You can host your own DataPM registry for private or public use. Be sure to read the DataPM Software License page to learn about allowed and not allowed uses of DataPM software.

## How To Deploy

Docker compose is the simplest method to deploy a DataPM Registry and supporting Postgres server. Use the following template as a start - or adapt it for your Kubernetes or Docker Swarm hosts.

```text
version: "3.7"

volumes:
  postgres_data_local: {}

services:
  datapm-registry:
    image: datapm-registry:latest
    ports:
      - "4000:4000"
    environment:
      - REGISTRY_NAME="Private DataPM Registry"
      - REGISTRY_URL=http://localhost:4000
      - REGISTRY_HOSTNAME=localhost
      - REGISTRY_PORT=4000
      - JWT_KEY=!!!!REPLACE_ME!!!
      - JWT_AUDIENCE=localhost
      - JWT_ISSUER=localhost
      - FILESYSTEM_STORAGE_DIRECTORY=local_storage
      - TYPEORM_IS_DIST=true
      - TYPEORM_PORT=5432
      - TYPEORM_HOST=postgres
      - TYPEORM_DATABASE=postgres
      - TYPEORM_SCHEMA=public
      - TYPEORM_USERNAME=postgres
      - TYPEORM_PASSWORD=postgres
      - REQUIRE_EMAIL_VERIFICATION=true
      - SMTP_SERVER=localhost
      - SMTP_PORT=25
      - SMTP_USER=
      - SMTP_PASSWORD=
      - SMTP_FROM_NAME="Localhost DataPM Registry"
      - SMTP_FROM_ADDRESS="datapm@localhost"
      - SMTP_SECURE=false
  postgres:
    image: postgres:11
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

```

## Why Host A Private Registry?

DataPM is a tool that dramatically simplifies data collaborations with other teams inside and outside your organization. While [datapm.io](https://datapm.io) offers a fantastic method to publish data packages privately on the public repository - you may not wish to move your data outside of your network.

Therefore, DataPM offers you the ability to host your own private registry. This private registry will be entirely in your control at a network firewall level, and thus the risk of an inadvertent data leak is greatly reduced.

When using a private DataPM registry, you'll still have access with all the great tools in the DataPM ecosystem, and you'll be able to dramatically improve your organization's collaborations around data.

## Requirements

Hosting a DataPM registry is relatively simple, and requires little hardware - especially if you are using DataPM only for schema management, and not the data itself (as most organizations likely choose to do).

### Software requirements

DataPM Registry requires a PostgreSQL version 12 database server. Your choose to use an existing instance, a cloud based instance, or to create a standalone instance using a simple Docker image from Postgres.

### Hardware requirements

DataPM Registry server does not require significant hardware resources, and runs well in a virtualized environment. These specs are given a simple minimum requirements set.

## Scaling The Registry

DataPM Registry server scales both horizontally and vertically with-in reason. You may create a cluster of DataPM Registry server instances behind a load balancer to scale horizontally. The load balancer should be configured with

-   Terminate SSL
-   No session or connection affinity

## Maintaining The Registry

DataPM like all software requires regular software updates. If you are using our published Docker images, upgrading is as simple as referencing the "latest" tag during a container version update. This works well in a Kubernetes or Docker Swarm cluster.

DataPM Registry server includes migration scripts that run automatically at startup. Therefore you do not have to apply database patches automatically, and generally rolling updates are acceptable - except across major versions of the registry.

You should capture a database backup before each upgrade.

### Backup requirements

When hosting your DataPM registry, you must backup your Postgres server on a regular basis. We suggest at least daily. DataPM is a robust service, but is not considered a backup solution for data.

We recommend Google Cloud SQL or AWS RDS Postgres instances - as they have robust backup capabilities built-in.
