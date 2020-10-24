---
id: devops
title: DataPM Use Case: DevOps
sidebar_label: DevOps
---

Integrating DataPM into your devops processes ensures that your data is delivered consistently with quality assurances. And DataPM provides many bonus features:

-   Always up-to-date data catalogs
-   Change management alerts
-   Easy visibility of data structures
-   Cross-silo integrations without copying data

## Continuous Data Integrations

DevOps tools such as puppet, chef, and others enable you to write pipelines of infrastructure and deployment automations that automatically provision databases, file stores, and many other solutions. Use DataPM in these solutions to automate the deployment of private and 3rd party data sets.

### Example: Command To Update Batch Data Set

The following command will fetch the datapm/example data set and place it in a JSON formatted file in the current working directory.

```text
datapm fetch datapm/example
```

After you run the above command and complete all of the prompts, the datapm client provide you with a fully configured fetch command that will require no user input to repeat your selections. You can use this extended command in your DevOps tools.

## Continuous Data Publishing

DataPM can be integrated into or become your complete data publishing work flow. Simply generate a package file with the following command one time.

```text
datapm generate-package <url-or-path-to-data>
```

After answering the prompts, the client will produce a package file that can be checked into your code repository.

When you update the data schema, or publish new batch data sets, run the following command to automatically update the package file.

```text
datapm update <path-to-package-file>
```

And then use the following command to publish the package file.

```text
datapm publish <path-to-package-file>
```
