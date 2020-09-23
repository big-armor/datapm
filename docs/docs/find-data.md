---
id: find-data
title: Use Case: Find Data
sidebar_label: Find Data
---

DataPM is the easiest way to discover new data. And not just that data exists, but the properties, value types, and value statistics of that data. When you've found data of interest, DataPM will help you deliver that data to the location and in the format that works best for you!

## Discover Data

The global public registry at [datapm.io](https://datapm.io), and the similarly hosted priviate registries, feature several methods to discover data. 


* Search by tile, description, and keywords
* Browse organization/team catalogs
* Browse curated collections 


The command line client includes a basic search feature for discovering packages. 

``` datapm search "<keywords>"```


## Inspect Packages

Each package on the registry contains detailed descriptions of the data available. The following is available directly in the web interface, and in the command line client. 

* Name
* Version
* Attribution
* Short and long descriptions
* Properties
  * Name
  * Value Types
  * Value Type Presence 
  * Value Type Statistics
* Data Location
* Data Schema & Format


The command line client can also be used view this information about any package. 

``` datapm info <packageIdentifier> ```



## Fetch Data 

Currently, you must use the command line client to fetch data. In the future, you will be able to use the web client to fetch data directly in the browser. 

The following command will help you identify the repository and format for storing the data fetched. 

``` datapm fetch <packageIdentifier> ```





