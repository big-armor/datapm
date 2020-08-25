# Data Package Manager (datapm) Registery Server

This is a data schema registery service for the Data Package Manager (datapm) ecosystem. It is based on graphql and runs in an express middleware server. This server holds only the schema information - and is not a repository for data.

Visit datapm.io for more information.

# How Run This Service
This service is available on docker hub, but requires setting some environment variables. 

1. Review `env.sh` and edit as necessary to set the appropriate values. 
2. `source ./env.sh` to apply the environment variables to your session. 
3. `docker run datapm/datapm-registry` to start the registry service
4. See the command line output for next steps, or visit datapm.io for more documentation.

# Developer Instructions

You can offer pull requests for this project. Instructions to build and run the project are below.


## Developer Prerequisites:
1. node 12 or newer
2. npm latest
3. Docker with docker-compose or an accessible postgresql database

## Run registry server in developer mode

1. `npm ci` command will install and build dependencies
2. `source ./env.sh` will set the local environment variables for the dev setup
4. `npm run start` command will start the docker based postgres server, and start the registry server with auto-restarts when code files are changed.

## Build and run production server

This registry service can be built and run locally with the native node client. This still requires the use of docker compose to start a postgres server (or you can modify the environment variables to point to an external postgres server)

1. `npm ci` command will install and build dependencies
2. `source ./env.sh` will set the local environment variables for the dev setup
4. `npm run start:server` will compile the typescript, copy assets into the "dist" folder, start the docker based postgres server, and start the registry server from the "dist" folder. 

## Buildl and run docker image locally

This registry service can be built and run locally via docker-compose. This command will build the registry service, and then use the docker-compose command to start the service. 

1. `npm ci` command will install and build dependencies
2. `npm run start:docker` will compile the typescript, copy assets into the "dist" folder, and then use docker compose to build a docker image and start the postgres server.


## Database Migrations

TypeORM is used to interact with the database and perform migrations. See [TypeORM Migrations](https://github.com/typeorm/typeorm/blob/master/docs/migrations.md) for reference.

1. Create a Migration (use a descriptive name).

   1. `npx typeorm migration:create -n CamelCaseMigrationName`
      - This will create a Typescript file with scaffolding to write your own migration

1. Run a Migration

   - `RUN_MIGRATION=true npx ts-node ./node_modules/typeorm/cli.js migration:run`
   - or `./migrate.sh`

1. Revert a Migration

   - `RUN_MIGRATION=true npx ts-node ./node_modules/typeorm/cli.js migration:revert`
