---
id: private-registry
title: Host A Private DataPM Registry
sidebar_label: Private Registry
---

You can host your own DataPM registry for private or public use. Be sure to read the [DataPM Software License](license.md) page to learn about allowed and not allowed uses of DataPM software.

## How To Deploy DataPM Registry?

DataPM registry server is a simple NodeJS application that can be deployed in most modern architectures. Below are some detailed deployment options.

Our [instructions for Docker Compose](private-docker-compose.md) are great for test and small private deployments.

Our [instructions for Google Cloud Run](private-google-cloud-run.md) are great for production deployments at extremely low cost and high scalability.

## Why Host A Private Registry?

DataPM is a tool that dramatically simplifies data collaborations with teams inside and outside your organization. While [datapm.io](https://datapm.io) offers a fantastic method to publish data packages privately on the public repository - you may have the requirement that no information about your data moves outside of your network.

Therefore, DataPM offers you the ability to host your own private registry. This private registry will be entirely in your control at a network firewall level, and thus the risk of an inadvertent data leak is greatly reduced.

When using a private DataPM registry, you'll still have access with all the great tools in the DataPM ecosystem, and you'll be able to dramatically improve your organization's collaborations around data.

## Software requirements

DataPM Registry requires a PostgreSQL version 13 database server. You can use an existing instance, a cloud based instance, or a Docker image from Postgres.

## Hardware requirements

DataPM Registry server does not require significant hardware resources, and runs well in a virtualized environment. These specs are given as basic minimums.

-   CPU: 1 core
-   RAM: 2GB
-   Storage: As much as necessary to hold the data that may be published to the server

## Scaling The Registry Server

DataPM Registry server scales both horizontally and vertically with-in reason. You may create a cluster of DataPM Registry server instances behind a load balancer to scale horizontally. The load balancer should be configured with

-   Terminate SSL
-   No session or connection affinity

## Data Storage

The server can be configured to store data and other assets either on local mounted disk, or to Google Cloud Storage. (We will likely add AWS S3 storage in the future. Please reach out if that is your requirements).

To store assets and data locally, set the following environment variable to the absolute path of the local directory for storage.

```text
STORAGE_URL="file://tmp-registry-server-storage"
```

To store assets on Google Cloud Storage, set the STORAGE_URL to a Google Cloud Storage bucket and path. Note that the Google Cloud Storage library used by DataPM Registry will attempt to resolve the GCP credentials using the standard methods (i.e. environment variables, machine associated service account, etc).

```text
STORAGE_URL="gs://your-bucket"
```

## Activity Logs

This server outputs logs via standard out (stdout) and standard error (stderr). Your infrastructure should capture and maintain these logs for as long as your retention policies require. The standard out logs contain activity logs that describe the major actions taken by users. Activity logs are output as JSON lines, and have the property "\_type" set as "ActivityLog". Activity logs can be used to meet your organizations data governance and compliance requirements.

## Maintaining The Registry

DataPM like all software requires regular software updates. If you are using our published Docker images, upgrading is as simple as referencing the "latest" tag during a container version update. This works well in a Kubernetes or Docker Swarm cluster.

Each new version of DataPM Registry server includes database migration scripts that run automatically at startup. Therefore you do not have to apply database patches. For minor and patch updates, you can perform rolling updates across clusters of servers - but this is not recommended for major version upgrades.

You should capture a database backup before each software upgrade.

### Backup requirements

When hosting your DataPM registry, you must backup your Postgres server on a regular basis. We suggest at least daily. DataPM is a robust service, but is not considered a backup solution for data.

We recommend Google Cloud SQL or AWS RDS Postgres instances - as they have robust backup capabilities built-in.

You should also regularly backup the "media" directory. This directory contains all of the assets (package files, user images, data itself, etc) that are published to the registry.
