---
id: publish-data
title: Use Case: Publish Data
sidebar_label: Publish Data
---

DataPM makes publishing data simple, and gives your consumers free powerful tools to ensure that they are successful with the data you provide. 

## Powerful Publishing

When you publish your DataPM Package File into a DataPM registry, you are enabling your customers to easily discover and consume your data. Your data schema becomes instantly avialable in the search index. You have control over the keywords, names, and descriptions.

Your customers can use the standards based and open source DataPM tools to easily consume your data. These powerful tools reliably deliver your data into the systems that the consumers need - in a single step. No ETL coding needed!


## Access Control

You set the privacy controls and terms under which consumers may access and use your data. These controls include restricting access to only specific users for private access, or public access.

You can [host your own private registry](private-registry.md) for ultimate control over the data - so that it never leaves your network. 

## Schema Only For Now

Currently, DataPM only supports hosting the package files (schema) in the registry. This means you must host the data in a separate location - such as GitHub, AWS S3, Google Storage, or other similar services. 

In the future, DataPM will support publishing the data along with the schema to datapm registries. 

## Generate A Package File

DataPM registries hold package files that contain only the schema of one or more data sets (which we call a data package). These package files also contain human descriptions, and the basic information necessary to access publicly avialable data. 

To generate your first package file, install the [command line client](command-line-client.md).


Use the following command to create a package file for the following CSV file

```text
datapm generate-package https://datapm.io/docs/test-data/state-codes.csv
```

You will be prompted to provide human descriptions, and to view a summary of the data contents. After you complete these prompts, your DataPM package file will be written to your local disk. 

Use the cat command to view the contents of your package. Optionally, edit it as you see fit, according to [DataPM Package File Specification](package-files.md). 

```text
cat state-codes.datapm.json
```

## Publish The Package File

When you are satisfied with the contents of the package file, you can publish it to a registry. 

```text
datapm publish state-codes.datapm.json
```

## View Package Info

After publishing you can view the package info on the registry, previewing what others will see. 

Modify the command below to view the info of the package you created above. 

```text
datapm info catalog-name/package-name
```

## Test Data Fetch

Your consumers will use the following command to fetch the data. You will likely want to test to understand their experience in consuming your data. 

```text
datapm fetch catalog-name/package-name
```

## Additional Data Sources

DataPM will in the future support more than CSV data sources, and many more data sinks (destination formats & systems). Currently, if you need to support additional data source formats, reach out to support@datapm.io










