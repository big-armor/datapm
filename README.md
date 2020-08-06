# Data Package Manager (datapm) Registery Server

This is a data schema registery service for the datapm ecosystem. It is based on graphql and runs in an express middleware server. This server holds only the schema information - and is not a repository for data.

Visit datapm.io for more information.

## Steps to run this registry server

1. Run `npm ci` command
2. Set the following environment variables (see env.sh or launch.json for example values for local development)
4. Run `npm run start` command

Prerequisites:

1. node 12 or newer
2. npm
3. An accessible postgresql database

## Docker Image

*Need docker image info here*

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
