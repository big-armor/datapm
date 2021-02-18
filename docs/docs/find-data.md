---
id: find-data
title: DataPM Use Case: Find Data
sidebar_label: Find Data
---

DataPM is the easiest way to discover new data. All DataPM listings include the properties, value types, and value statistics of that data. When you've found data of interest, DataPM will help you deliver that data to the location and in the format that works best for you!

## Discover Data

The global public registry at [datapm.io](https://datapm.io), and the similarly hosted private registries, feature several methods to discover data.

-   Search by tile, description, and keywords
-   Browse organization/team catalogs
-   Browse curated collections

The [command line client](command-line-client.md) includes a basic search feature for discovering packages.

```text
datapm search "example keywords"
```

## Inspect Packages

Each package on the registry contains detailed descriptions of the data available. The following is available directly in the web interface, and in the [command line client](command-line-client.md).

-   Name
-   Version
-   Attribution
-   Short and long descriptions
-   Properties
    -   Name
    -   Value Types
    -   Value Type Presence
    -   Value Type Statistics
-   Data Location
-   Data Schema & Format

The [command line client](command-line-client.md) can also be used view this information about any package.

```text
datapm info catalog-name/package-name
```

Private registries require a full URL for the package.

```text
datapm info https://private.server.net/catalog-name/package-name
```

## Fetch Data

Currently, you must use the command line client to fetch data. In the future, you will be able to use the web client to fetch data directly in the browser.

The following command will help you identify the repository and format for storing the data fetched.

```text
datapm fetch catalog-name/package-name
```

Private registries require a full URL for the package.

```text
datapm fetch https://private.server.net/catalog-name/package-name
```
