# DataPM

This project contains the DataPM Registry Server, including the frontend angular project, backend apollo-graphql project, and documentation. There is a README.md in the folder for each.

## How to run in Docker (without first building locally)

Use the `docker/docker-compose.yml` file to run a copy of the registry from the docker hub.

```
cd docker
docker-compose up
```

## How to build and run locally

Use npm in this top level directory to build all submodules and produce a docker image.

```
npm ci
npm run build
```

This produces a docker image labeled datapm-registry. You can then use the following command to run the locally built image and all of it's supporting services.

```
npm run start
```

This "local-build" of docker provides a [maildev] SMTP server - which does not forward mail! To view any email sent by the registry server, simply open the maildev web interface on port 1080.

```
http://localhost:1080
```

# How to prepare for development

The following can should be done before you start coding and testing.

```
npm run prepare-dev-environment
```

That script builds the lib folder, then links the lib/dist folder to all other sub-projects and builds them.

## How to run Postgres and SMTP only

You can run only Postgres and SMTP with the following command from the root of this project. This is useful for developers running the backend as an active service (though they should focus on an integration test work flow in the backend primarily).

```
cd docker
docker-compose up postgres smtp
```

## License

This software is released under the CC-A-ND-4.0 license.
