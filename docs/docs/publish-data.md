---
id: publish-data
title: Use Case: Publish Data
sidebar_label: Publish Data
---

DataPM makes publishing data simple, and gives your consumers free powerful tools to ensure that they are successful with the data you provide.

## Powerful Publishing

When you publish your DataPM Package File into a DataPM registry, you are enabling your customers to easily discover and consume your data. Your data schema becomes instantly available in the search index. You have control over the keywords, names, and descriptions.

Your customers can use the standards based and open source DataPM tools to easily consume your data. These powerful tools reliably deliver your data into the systems that the consumers need - in a single step. No ETL coding needed!

## Access Control

You set the privacy controls and terms under which consumers may access and use your data. These controls include restricting access to only specific users for private access, or public access.

You can [host your own private registry](private-registry.md) for ultimate control over the data - so that it never leaves your network.

## Data Hosting

DataPM offers two methods of accessing data.

1. The data is hosted elsewhere, and only the schema and description of the data is published to the DataPM registry.

    - This is useful when the data is already readily available.

2. The data and the schema are published to the DataPM Registry.

## Generate A Package File

DataPM registries hold package files that contain the schema of one or more data sets (which we call a data package). These package files also contain human descriptions and the basic information necessary to access the data.

To generate your first package file, install the [command line client](command-line-client.md).

Use the following command to create a package file for the following CSV file

```text
datapm package https://datapm.io/docs/test-data/state-codes.csv
```

You will be prompted to provide human descriptions, and to view a summary of the data contents. After you complete these prompts, your DataPM package file will be written to your local disk. Optionally, you may choose to immediately publish the package file.

## Edit The Package File

You can use the "edit" command to edit the contents of your package file.

```text
datapm edit my-package-file.datapm.json
```

You can even edit the context of the package file directly on the registry.

```text
datapm edit my-catalog/my-package
```

You can modify many of the descriptions in the package file directly in the web client. Just visit the package file listing in your browser.

Or you can manually view the contents of your package and edit it as you see fit, according to [DataPM Package File Specification](package-files.md).

## Update The Package File

You can use the "update" command to refresh the data statistics and schema of your package file.

```text
datapm update my-package-file.datapm.json
```

You can also use the "update" command directly against the package file on the registry.

```text
datapm update my-catalog/my-package
```

## Publish The Package File

When you are satisfied with the contents of the package file, you can publish it to a public or private registry.

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
