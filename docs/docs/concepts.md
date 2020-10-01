---
id: concepts
title: Concepts
---

DataPM stands for Data Package Manager, and consists of three major components. 

* Package Files
* Registry
* Clients

The registry holds "package files", and the client performs actions such as searching for package files and using the package files to fetch data.

This document explains the details of each component and important associated concepts. 

## Registries

The public global registry is available at [datapm.io](https://datapm.io) - and this is where you should start. Data owners publish data packages (currently consiting only of schemas) to this global public registry, and to their own private registries. 


### What is in a registry?

A DataPM registry holds "Package Files". These package files contain the descriptions, schemas, formats, and locations of available data. Think of a registry like a library index. It doesn't hold the data - just what it is, and where to get it. 

*Important Note:* Right now, DataPM only supports publishing data schemas. So you must host the actual dataset in another location - such as GitHub or a public web server. And that hosting must be publicly available. In the future, DataPM will also support hosting the data itself. 

### Where are the registries?

The primary global public registry is hosted at [datapm.io](https://datapm.io) - try it out! It's free to use, and offers tons of great data packages. 

You can also run your own private registry - which requires providing your own cloud or on-premises hosting using a Kubernetes, Docker, VMware, or some other similar container service. 

### Why would I want to host my own private registry?

Hosting your own DataPM registry allows your team to combine private and 3rd party data to create rich insights and competitive advantages. 

Also, a private DataPM registry is a great way to create catalogs of your organization's data, while maintaining absolute control over every aspect of the data's presence. Imagine having a complete index of all of the data in your organization - without copying data or changing your existing architecture. 



## Package Files

Package Files contain the data schema, descriptions, and statistics about one or more data sets. Think of package files as you would a library index card. It doesn't contain the data itself - rather only a description of what data is available. 

### What is in a package file?

DataPM package files contain the following information. 

* Name
* Description
* Schema
    * Properties
    * Value types
    * Value statistics
* File/Stream Location
* Content Format

### What is the package file format?

DataPM package files are written in JSON format, and have their own JSON Schema's that are a restricting extension of the JSON Schema Draft 07 specification. 

[Learn more about the structure of Package Files](package-files.md) 

### How are package files generated?

The DataPM Command Line Client's "generate-package" command automatically generates package files from common file formats, databases, and other repositories. The client will prompt you with simple questions about the discovered contents, and then write the final package file to your local disk. 

### Do I have to have a package file to get data?

No, you do not have to have a package file to make use of DataPM. The DataPM command line client's "fetch" command can be given any common file format, database, or cloud repository - and it will perform the typical ETL work, just like there was an automatically generated package file. 


## Clients

DataPM offers both a web and command line client - each with their own use cases. 

### Web client

When you view a DataPM registry, you are using the web client. This client is searching the registry, providing details about the packages available, and will in the future provide easy to use fetch/stream mechanisms for the data packages. 

The web client is intended to be user friendly, but does not provide all of the features available in the command line client. 


### Command Line Client

The DataPM Command Line Client is the most powerful way to interact with and automate your data publishing and consuming processes. Use the command line client to do the following. 

* Generate package files automatically
* Update package files
* Search for package files on a registry
* Fetch/Stream data - even without a registry


#### Easy ETL Data Delivery

The DataPM command line client can deliver any package to many useful repositories including:

* Local files
* Databases
* Cloud storage
* Streaming systems

DataPM takes care of the entire ETL process for every data package in a registry. 

#### Automated Data Delivery

Use the DataPM client in your devops processes to automate the publishing and consuming of data packages. DataPM ensures that your publishing process provides high quality results, and that your consuming processes deliver clean fault tolerant data. 









