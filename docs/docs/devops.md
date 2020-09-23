---
id: devops
title: Use Case: DevOps
sidebar_label: DevOps
---

Integrating DataPM into your devops processes ensures that your data is delivered consistently with quality assurances. And DataPM provides many bonus features:

* Always up-to-date data catalogs
* Change management alerts
* Easy visibility of data structures
* Cross-silo integrations without copying data

## Continuous Data Integrations

DevOps tools such as puppet, chef, and others enable you to write pipelines of infrastructure and deployment automations that automatically provision databases, file stores, and many other solutions. Use DataPM in these solutions to automate the deployment of private and 3rd party data sets. 

### Example: Command To Update Batch Data Set

The following command will fetch the datapm/example data set and place it in a JSON formated file in the current working directory.

``` datapm fetch datapm/example TODO INSERT COMPLETE JSON FETCH HERE ```

 You can discover additional configurations for this command by simply omitting the configuration options. The datapm client will prompt you with the available options, and provide you with a fully configured fetch command after a successful fetch. 


## Continuous Data Publishing

DataPM can be integrated into or become your complete data publishing work flow. Simply generate a package file with the following command. 

``` datapm generate-package <url-or-path-to-data>```

After answering the prompts, the client will produce a package file that can be checked into your code repository. 

When you update the data schema, or publish new batch data sets, run the following command to automatically update the package file. 

``` datapm update <path-to-package-file>```

And then use the following command to publish the package file. 

``` datapm publish <path-to-package-file>```








