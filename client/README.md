# Data Package Manager (datapm) Command Line Client

[DataPM.io](https://datapm.io) is a free, open-source, and easy-to-use data management platform. Use DataPM to quickly create accurate data catalogs, publish high quality data sets, and ETL data into your production systems.

Read the [Command Line Client](https://datapm.io/docs/command-line-client/) docs for more information about how to use this client.

# Developer Guide

Use Node version 14 to build and test this client.

```
# From the "client" directory
npm ci
npm run build
```

### How to test this client without building

Use the following command to build and run the client in developer mode.

```
npm run start
```

For example you can run the search command like this:

```
npm run start search weather
```

If you need to use command line arguments, add -- as an escape for the tailing arguments. Like this:

```
npm run start -- fetch noaa/weather --forceUpdate
```

## Debugging

To debug, simply open this project in VSCode. Install the recommend extensions (should see a popup on first open). Then open a Javascript Debug Terminal and run any command as shown above. The debugger should automatically start and attach.
