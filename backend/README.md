# Data Package Manager (datapm) Registry Server

[DataPM.io](https://datapm.io) is a free, open-source, and easy-to-use data management platform. Use DataPM to quickly create accurate data catalogs, publish high quality data sets, and ETL data into your production systems.

See the [Private Registry](https://datapm.io/docs/registry) docs on how to run your own DataPM registry.

# Developer Guide

You can offer pull requests for this project. Instructions to build and run the project are below.

## Developer Environment Prerequisites:

1. NodeJS 16 or newer
1. Docker with docker-compose

# Prepare the project

The following should be done before you start coding and testing.

```
# From the root of the project directory
npm run prepare-dev-environment
```

That script builds the lib folder, then links the lib/dist folder to all other sub-projects and builds them. This is required so that the correct copy of the lib is linked to your project. (We're looking for better ways to do this, submit a PR if you have ideas.)

## Start Postgres and SMTP Server

Before you can run the registry server locally, you must have Postgres and SMTP running. Use the following command to start local Postgres and SMTP services using docker.

```
cd ../docker
docker-compose up postgres smtp
cd ../backend
```

## Start Backend Dev Server

Use the following command to start the backend app server in developer mode.

```
# from the "backend" directory
npm run start
```

## Start the Frontend Dev Server

Use the following command to start the frontend web server in developer mode.

```
cd ../frontend
npm run start
```

Once started, open a browser to [http://localhost:4200]

The GraphQL playground is available at [http://localhost:4200/graphql]

## Database Migrations

If you change any of the backend/src/entity files, you will need to create a database migration. These migrations automatically update the postgresql database schemas on datapm server start. To create a migration, use the following command:

```
npx typeorm migration:create -n CamelCaseMigrationName
```

TypeORM is used to interact with the database and perform migrations. See [TypeORM Migrations](https://github.com/typeorm/typeorm/blob/master/docs/migrations.md) for reference.
