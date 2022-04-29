# Data Package Manager (datapm) Command Line Client

[DataPM.io](https://datapm.io) is a free, open-source, and easy-to-use data management platform. Use DataPM to quickly create accurate data catalogs, publish high quality data sets, and ETL data into your production systems.

Read the [Command Line Client](https://datapm.io/docs/command-line-client/) docs for more information about how to use this client.

# Developer Guide

Use Node version in the top level .nvmrc file (or use the `nvm use` command if you have nvm installed).

```
# From the top level directory
npm ci
npm run prepare-dev-environment
```

Use the following commands to run the client.

```
cd client
npm run start
```

You can append arguments to the command as well. For example you can run the search command like this:

```
npm run start search tickers
```

If you need to use command line arguments, add -- as an escape for the tailing arguments. Like this:

```
npm run start -- fetch noaa/weather --forceUpdate
```

## Debugging

To debug, simply open this project in VSCode. Install the recommend extensions (should see a popup on first open). Then open a Javascript Debug Terminal and run any command as shown above. The debugger should automatically start and attach.

## Creating a Connector

Read the [CONNECTORS.md](../client-lib/CONNECTORS.md) file in the client-lib directory for information about creating source and sink connectors.
