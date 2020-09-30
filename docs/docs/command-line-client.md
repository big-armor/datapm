---
id: command-line-client
title: DataPM Command Line Client
sidebar_label: Command Line Client
---

DataPM's mission is to make the world's data more accessible. This command line client helps you...

* Search for and discover new data
* Aquire new data easily

The DataPM client is easily installed, and almost every task is a self explanatory single command execution. The DataPM client features an easy to use prompts system, and always gives you easy to copy next steps after each command. 


## Install the DataPM Command Line Client

If you do not already have NodeJS and NPM, install them using the following link

https://nodejs.org/en/

Verify that you have installed Node 12 or greater, and the latest npm client. 

```text
node -v

npm -v
```

Install the datapm-client package globally. This allows you to run the datapm command from any working directory.

```text
npm install -g datapm-client
```

Verify that the datapm-client package is installed

```text
datapm --version
```

## Add Keys and Private Registries

To access or publish private packages, and to communicate with private registries, you'll need to add a registry and API key to your command line client. Here are the instructions to generate an API Key

1. Using a web browser, visit [datapm.io](https://datapm.io) or a private registry
1. Log in or sign up as a new user
1. Click your profile icon in the upper right
1. Click "API Keys"
1. Click "Create New API Key"
1. Copy the command provided
1. Paste the command into your terminal


You will now have an API Key associated with the registry. Your command line client will authenticate as your user, and perform actions on your behalf. If the registry is private, it will also have been added to the DataPM command line client configuration - so it will be used for searches, etc. 

## Search DataPM Registries

You can search the public [datapm.io](https://datapm.io) registry using a modern web browser. Or use the following command to search via the command line client. 

```text
datapm search "example search terms"
```

Your search result will include packages with titles, descriptions, or keywords that match your search terms. 

## Consume Data

Use the following command to retrieve a batch data package from the datapm.io public registry. 

```text
datapm fetch datapm/example
```

You can also fetch packages from other registries by specifying the package URL. 

```text
datapm fetch https://datapm-example.company.com/catalog/package
```

## Publish Data

*Important Note:* Right now, DataPM only supports publishing data schemas. So you must host the actual data in another location - such as GitHub or a public webserver. And that hosting must be publically available. In the future, DataPM will also support hosting the data itself for public and private data hosting.

Use the command line client to create a data package file based on any publically avialable data set. 

```text
datapm generate-package https://some-web-server.com/path/to/data.csv
```

Follow the prompts to complete the package file. Then use the following command to publish the package. 

```text
datapm publish my-package-file.datapm.json
```

You can update the schema and statistics in the package file using the following command. 

```text
datapm update my-package-file.datapm.json
```

And then you can re-publish the updates using the same publish command above. 
