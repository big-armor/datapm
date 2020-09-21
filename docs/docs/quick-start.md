---
id: quick-start
title: Quick Start Guide
sidebar_label: Quick Start
---

DataPM helps you quickly publish and consume data. Let's start with consuming. 

## Quick Concepts

 DataPM (Data Package Manager) is a collection of public and private registries that contain schema descriptions for data packages. You will use the DataPM command-line and/or web clients to search the registry, learn about package contents, and fetch or stream the package. You can can also publish data packages to a registry using the same clients. 

 DataPM currently supports batch transfer, and will in the future support streaming transfer of data packages. 

You can also host your own private or public data registries. See the software license for allowed and prohbited use cases.


## Install the DataPM Command Line Client

If you do not already have NodeJS and NPM, install them using the following link

https://nodejs.org/en/

Verify that you have installed Node 12, and the latest npm client. 

```node -v```

```npm -v```

Install the datapm-client package globally.

```npm install -g datapm-client```

Verify that the datapm-client package is installed

```datapm --version```


## Searching DataPM Registries

You can search the public datapm.io registry using a modern web browser. Or use the following command to search via the command line client. 

```datapm search example```

Your search result will include packages with titles, descriptions, or keywords that match your search terms. 

## Consuming Data with DataPM

Use the following command to retrieve a batch data package from the datapm.io public registry. 

```datapm fetch datapm/example```

You can also fetch packages from other registries by specifying the package URL. 

```datapm fetch https://datapm-example.company.com/catalog/package```

## Publishing Data to DataPM

*Important Note:* Right now, datapm only supports publishing the schema. So you must host the actual dataset in another location - such as github or a public webserver. And that hosting must be publically available. In the future, DataPM will also support hosting the data itself. 

Use the command line client to create a data package file based on any publically avialable data set. 

```datapm generate-package https://some-web-server.com/path/to/data.csv```

Follow the prompts to complete the package file. Then use the following command to publish the package. 

```datapm publish my-package-file.datapm.json```

You can update the schema and statistics in the package file using the following command. 

```datapm update my-package-file.datapm.json```

And then you can re-publish the updates using the same publish command above. 



