# Data Package Manager (datapm) Command Line Client

datapm.io is the easiest way to discover, deploy, query, and manage data. Use this client with the public datapm.io registry, or host your own private registry and repo.

## How To Build This Code

Use Node version 12 to build and test this client.

```
npm ci
npm run build
```

### How to test this client without building

```
npm ci
npm run start [append command options]
```

For example you can run

```
npm run start search weather
```

## Search packages

Use the following command to search for data packages. This example searches for weather data. This will return a list of packages and their descriptions. Use the -V switch to learn more about each package.

    datapm search weather

## Full package information

Use the "info" command to view the details of package - including the data types, all their attributes, and statistics about the types of data in each attribute. Use the -V switch for all information.

    datapm info noaa/weather

## Fetch a data package

Use the "fetch" command to deploy a data set to a file, database, cloud server, etc. Answer the simple prompts choose your desired storage and format.

    datapm fetch noaa/weather

## Publish a package

Use the "generate-package" command to create a package file from an existing data source.

    datapm generate-package https://myserver.com/path/to/my.csv

You will have the opportunity to publish the package during the prompts. Or you may later use the following command.

    datapm publish my-package.datapm.json

## Update a package

You can update the schema and statistics in the package file using the following command.

    datapm update my-package-file.datapm.json

    datapm publish my-package-file.datapm.json

And then you can re-publish the updates using the same publish command above.

# Developer Information

To debug, use the `node --inspect -r ts-node/register src/main.ts ....` command to attach a remote debugger. This project includes the .vscode/launch.json configuration that will start the remote debugger.
