---
id: package-files
title: DataPM Package Files
sidebar_label: Package Files
---

DataPM Package Files contain the description, schema, and access information for one or more available data sets. 


## Concepts

It is important to note that package files do not contain the data itself - which is accessed via a method described in the package file. Package files are intended to describe every aspect necessary to discovering, evaluating, obtaining, parsing, and deploying data - such that a computer instead of a human can perform those tasks. 

Package Files must reference data in the way that the target audience and the target DataPM registry can access the data. In the future DataPM registries will support deploying the data and schema, but for now the registry only supports deploying the schema. Therefore you must host the data on another solution. 

## Examples

Here are a few example DataPM package files for your reference. 
* [country-year-gdp.datapm.json](/docs/test-packagefiles/country-year-gdp.datapm.json)
* [us-state-abbreviation-codes.datapm.json](/docs/test-packagefiles/us-state-abbreviation-codes.datapm.json)
* [us-congressional-legislators.datapm.json](/docs/test-packagefiles/us-congressional-legislators.datapm.json)


## File Format

A DataPM package file is stored in JSON format, and adheres to the published [DataPM Package File JSON Schema spec](/docs/datapm-package-file-schema-v1.json) - which is itself a restricting extension of the [JSON Schema Draft 07 specification](https://json-schema.org/specification-links.html#draft-7). 



## Validating

DataPM registries validate submitted package files against the specification linked above. Therefore you may wish to use a [JSON Schema validator](https://json-schema.org/implementations.html#validators) in your pre-publishing process. 

[Ajv-cli](https://www.npmjs.com/package/ajv-cli) is a simple validator to implement and use. 

```text

# Install AJV commmand line client
npm install -g ajv-cli

# Get the package file schema
curl https://datapm.io/docs/datapm-package-file-schema-v1.json -o datapm-package-file-schema-v1.json

# Validate the package file against the schema
ajv validate -s  datapm-package-file-schema-v1.json -d my-package-file.datapm.json

```

## Top Level Properties

The following are the top level properties in the DataPM Package File JSON file specification. 

| Property | Type | Required |  Description |
| :-- | :--: | :--: | :-- |
| description | String | Required | A short sentence or two about the package. Use readmeFile to reference a longer markdown based description. |
| displayName | String | Required | A short user friendly name for the package | 
| packageSlug | String | Required | The unique identifier for this package. lower case letters, numbers, and hyphens only. Must not start or end in a hyphen|
| schemas | Array | Required | A set of schemas of the data that are available in the package. See Schemas section below.|
| updatedDate | String | Required | The last updated date of the package file - not the data! In the ISO 8601 format| 
| version | String | Required | Semantic Versioning format of major.minor.patch |
| contributors | Array | Optional | A list of contributors for this package. See Contributors below | 
| generatedBy | String | Optional | The name of the person or system that generated the package file. |
| licenseFile | String | Optional | Relative path to the LICENSE file for this package. Defaults to package-file-name-license.md or README.md in that order. | 
| readmeFile | String | Optional | Relative path to the README for this package. Defaults to package-file-name.md or README.md in that order. | 
| registries | Array | Optional | See Registries properties below | 
| website | String | Optional | Website of the person or organization that maintains and/or holds the license of this data. This is for attribution purposes only | 

## Schemas 

These are the properties for the "schemas" top level array property. These schemas are validated both by the [JSON Schema Draft 07 specification](https://json-schema.org/specification-links.html#draft-7), and the DataPM Package file specification. This document contains only the properties listed in the DataPM specification - as they are generally more restrictive than the [JSON Schema Draft 07 specification](https://json-schema.org/specification-links.html#draft-7). 


| Property | Type | Required |  Description |
| :-- | :--: | :--: | :-- |
| parser | Object | Required | A configuration object describing the parser required for the data. See Parser section below |
| properties | Object | Required | See Schema Properties table below | 
| source | Object | Required | See Source properties below | 
| byteCount | Integer | Optional | The exact or approximate number of bytes in the raw dataset. This should include only the 'values' and not the format, schema, or keys | 
| byteCountApproximate | Boolean | Optional | Whether the provided byte count is approximate (true) or exact (false). Default is false (exact).
| recordCount | Integer | Optional | The exact or estimated number of records in the data set.
| recordCountApproximate | Boolean | Optional | Whether the recordCount property value is exact (false) or approximate (true). Defaults false (exact).|

## Schema Properties
Please refer to the [Understanding JSON Schema website](https://json-schema.org/understanding-json-schema/) for detailed information on the structure of Draft-07 (7.0) properties. 

The DataPM specification only additionally requires that the "type" field is specified. 

## Parser

These are the properties of the parser property of the top level schema object. 

| Property | Type | Required |  Description |
| :-- | :--: | :--: | :-- |
| mimeType | String | Required | The mimeType of the data stream which identifies the parser implementation needed to parse the data | 
| configuration | Object | Optional | A plain JSON object with properties as defined by the parser implementation. | 


## Registries

These are the properties for the registry objects in the top level "registries" array property. 

| Property | Type | Required |  Description |
| :-- | :--: | :--: | :-- |
| hostname | String | Required| The hostname or ip address of the registry.
| port | Integer | Required | The TCP port of the registry.  

## Contributor Properties

These are the properties for the contributor object in the top level "contributors" array property.

| Property | Type | Required |  Description |
| :-- | :--: | :--: | :-- |
| description | String | Optional | Description of the person's work on this data. | 
| name | String | Optional | Name of the contributor | 
| emailAddress | String | Optional | Email Address of the contributor | 
| username | String | Optional | Username of the contributor on the registry to which this package will be published. |
| website | String | Optional | Website of the contributor |





