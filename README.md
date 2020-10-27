DataPM Registry Server

This project contains the DataPM Registry Server, including the frontend angular project, backend apollo-graphql project, and documentation. You will find a README.md in the folder for each.

## How to build and run locally

Use npm in this top level directory to build all submodules and produce a docker image.

```
npm ci
npm run build
```

This produces a docker image labeled datapm-registry. You can then use docker-compose to run the locally built image.

```
docker-compose -f docker/docker-compose-local-build.yml up
```

## How to run in Docker

Use the `docker/docker-compose.yml` file to run a copy of the registry from the docker hub.

```
cd docker
docker-compose up
```

## How to run Postgres only

You can run only Postgres with the following command from the root of this project.

```
cd docker
docker-compose up -d postgres
```

## License

This software is released under the CC-A-ND-4.0 license.
