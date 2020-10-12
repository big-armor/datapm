DataPM Registry Server

This project contains the DataPM Registry Server, including the frontend angular project, backend apollo-graphql project, and documentation. You will find a README.md in the folder for each.

## How to build

Use npm in this top level directory to build all submodules and produce a docker image. 

```

npm ci


npm run build


```

This produces a docker image labeled datapm-registry


## How to run in Docker

First you must build the project using the commands above. The docker build uses the artifacts from the build above to dramatically reduce the docker build time. 

Use the following command from the root directory of this project to use docker-compose to start a local postgres DB and DataPM Registry server. 


```
npm run start
```

You can run only postgres with the following command

```
docker-compose -f docker/docker-compose.yml up -d postgres
```

## License

This software is released under the CC-A-ND-4.0 license. 

