---
id: quick-start
title: Quick Start Guide
sidebar_label: Quick Start
---

DataPM helps you quickly publish and consume data. Let's start with some concepts.

## Quick Concepts

Visit [datapm.io](https://datapm.io) to search and discover packages of data. Then use the command line client to fetch those packages. You can publish your own data packages, and host your own private registry!

[View full concepts documentation](concepts.md)

## Install the DataPM Command Line Client

If you do not already have NodeJS and NPM, <a href="https://nodejs.org/en/" target="_blank">install NodeJS and NPM</a>. Then use the following command to install the datapm-client.

```text
npm install -g datapm-client
```

[View full install instructions](command-line-client.md)

## Search, Consume, and Publish Data Packages

You can search the public [datapm.io](https://datapm.io) registry using a modern web browser. Or use the following command to search via the command line client.

```text
datapm search "example search"
```

Then fetch a specific data package.

```text
datapm fetch datapm/example
```

Generate your own packages from a publicly available data set.

```text
datapm package https://some-web-server.com/path/to/data.csv

datapm publish my-package-file.datapm.json
```

You can update the schema and statistics in the package file using the following command.

```text
datapm update my-package-file.datapm.json

datapm publish my-package-file.datapm.json
```

And then you can re-publish the updates using the same publish command above.

[View full command line documentation](command-line-client.md)

## Host A Private Registry

DataPM offers the Registry as a free, and soon to be open source Docker image. The registry server requires a PostgreSQL version 12 database. We suggest a minimum of 2GB of RAM, two modern CPU cores, and 1GB+ for the PostgreSQL database.

[View full private registry documentation](private-registry.md) for a detailed description of how to host your own registry.
