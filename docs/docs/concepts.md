---
id: concepts
title: Concepts
---

DataPM stands for Data Package Manager, and consists of three major components.

-   [Package Files](package-files.md)
-   [Registry](registry-api.md)
-   Clients: [Command Line](command-line-client.md) & Web Interface

The registry holds packages, and the client performs actions such as searching for packages and fetching data from those packages.

This document explains the details of each component and important associated concepts.

## Registries

The public global registry is available at [datapm.io](https://datapm.io) - and this is where you should start. Data publishers push data packages to this global public registry. The public registry supports both public and private data access use cases.

You can [host your own private DataPM registry](private-registry.md). This is useful when your data security requirements do not allow for even meta-data about your data to leave your network.

### What is in a registry?

A DataPM registry holds "data packages". These package contain the descriptions, schemas, formats, and locations of available data. Think of a registry like a library index. It MIGHT also hold the data - or just point to where the client should find the data.

### Why would I want to host my own private registry?

A private DataPM registry is a great way to create catalogs of your organization's data, while maintaining absolute control over every aspect of the data's presence. Imagine having a complete index of all of the data in your organization - without copying data or changing your existing architecture.

A private DataPM registry also gives you a super secure way to share data inside and outside of your organization.

## Package Files

Package Files contain metadata information, descriptions, and statistics about one or more data schemas. Think of package files as you would a library index card. It doesn't contain the data itself - rather only a description of what data is available, how to obtain, and how to parse that data.

### What is in a package file?

DataPM [package files](package-files.md) contain the following information.

-   Name
-   Description
-   Schema
    -   Properties
    -   Value types
    -   Value statistics
-   File/Stream Location
-   Content Format

### What is the package file format?

DataPM package files are written in JSON format, and have their own JSON Schema's that are a restricting extension of the [JSON Schema Draft 07]() specification.

[Learn more about the structure of Package Files](package-files.md)

### How are package files generated?

The DataPM Command Line Client's "package" command automatically creates package files from common file formats, databases, and other data repositories. The client will prompt you with simple questions about the discovered contents, and then write the final package file to your local disk.

### Do I have to have a package file to get data?

No, you do not have to have a package file to make use of DataPM. The DataPM command line client's "fetch" command can be given any common file format, database, or cloud repository - and it will perform the typical ETL work, just like there was an automatically generated package file.

## Clients

DataPM offers both a web and command line client - each with their own use cases.

### Web client

When you view a DataPM registry, you are using the web client. This client is searching the registry, providing details about the packages available, and will in the future provide easy to use fetch/stream mechanisms for the data packages.

The web client is intended to be user friendly, but does not provide all of the features available in the command line client.

### Command Line Client

The [DataPM Command Line Client](command-line-client.md) is the most powerful way to interact with and automate your data publishing and consuming processes. Use the command line client to do the following.

-   Generate package files automatically
-   Update package files
-   Search for package files on a registry
-   Fetch data - even without a registry

#### Easy ETL Data Delivery

The DataPM command line client can deliver any package to many useful repositories including:

-   Local files
-   Databases
-   Cloud storage
-   Streaming systems

DataPM takes care of the entire ETL process for every data package in a registry.

#### Automated Data Delivery

Use the DataPM client in your devops processes to automate the publishing and consuming of data packages. DataPM ensures that your publishing process provides high quality results, and that your consuming processes deliver clean fault tolerant data. Read more about [DataPM's DevOps Use Cases](devops.md).
