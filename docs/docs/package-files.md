---
id: package-files
title: DataPM Package Files
sidebar_label: Package Files
---

DataPM Package Files contain the description, schema, and access information for one or more available data sets.

## Concepts

It is important to note that package files do not contain the data itself - which is accessed via a method described in the package file. Package files are intended to describe every aspect necessary to discover, evaluate, obtain, parse, and deploy data - such that a computer instead of a human can perform those tasks.

Package Files must reference data in the way that the target audience and the target DataPM registry can access the data. Data can be hosted directly in the DataPM Registry or may be hosted elsewhere and simply referenced by the package file.

## Examples

Here are a few example DataPM package files for your reference.

-   [country-year-gdp.datapm.json](/docs/test-packagefiles/country-year-gdp.datapm.json)
-   [us-state-abbreviation-codes.datapm.json](/docs/test-packagefiles/us-state-abbreviation-codes.datapm.json)
-   [us-congressional-legislators.datapm.json](/docs/test-packagefiles/us-congressional-legislators.datapm.json)

## File Format

A DataPM package file is stored in JSON format, and adheres to the published [DataPM Package File JSON Schema spec](/static/datapm-package-file-schema-current.json) - which is itself a restricting extension of the [JSON Schema Draft 07 specification](https://json-schema.org/specification-links.html#draft-7).

### Validating Package File Formats

[https://jsonschema.dev](https://jsonschema.dev) is the official JSON Schema validator. You can copy the contents of [datapm-package-file-schema-current.json](/static/datapm-package-file-schema-current.json) into the "JSON Schema" field, and your package file into the "JSON instance" to validate.

### Command Line Validation

[Ajv-cli](https://www.npmjs.com/package/ajv-cli) is a simple validator to implement and use.

```text

# Install AJV commmand line client
npm install -g ajv-cli

# Get the package file schema
curl https://datapm.io/static/datapm-package-file-schema-current.json -o datapm-package-file-schema-current.json

# Validate the package file against the schema
ajv validate -s  datapm-package-file-schema-current.json -d my-package-file.datapm.json

```

## Top Level Properties

The following are the top level properties in the DataPM Package File JSON file specification.

| Property        |  Type  | Required | Description                                                                                                                                         |
| :-------------- | :----: | :------: | :-------------------------------------------------------------------------------------------------------------------------------------------------- |
| description     | String | Required | A short sentence or two about the package. Use readmeFile to reference a longer markdown based description.                                         |
| displayName     | String | Required | A short user friendly name for the package                                                                                                          |
| contactEmail    | String | Optional | The publishers email address                                                                                                                        |
| packageSlug     | String | Required | The unique identifier for this package. lower case letters, numbers, and hyphens only. Must not start or end in a hyphen                            |
| schemas         | Array  | Required | A set of schemas of the data that are available in the package. See Schemas section below.                                                          |
| sources         | Array  | Required | See Source properties below                                                                                                                         |
| updatedDate     | String | Required | The last updated date of the package file - not the data! In the ISO 8601 format                                                                    |
| version         | String | Required | Semantic Versioning format of major.minor.patch                                                                                                     |
| contributors    | Array  | Optional | A list of contributors for this package. See Contributors below                                                                                     |
| generatedBy     | String | Optional | The name of the person or system that generated the package file.                                                                                   |
| licenseFile     | String | Optional | Relative path, from the package file, to the LICENSE.md file for this package. Defaults to package-file-name-license.md or README.md in that order. |
| readmeFile      | String | Optional | Relative path, from the package file, to the README.md for this package. Defaults to package-file-name.md or README.md in that order.               |
| licenseMarkdown | String | Optional | Markdown formatted content that describes the license for the schema and data referenced.                                                           |
| readmeMarkdown  | String | Optional | Markdown formatted README content for the package.                                                                                                  |
| registries      | Array  | Optional | See Registries properties below                                                                                                                     |
| website         | String | Optional | Website of the person or organization that maintains and/or holds the license of this data. This is for attribution purposes only                   |

## Schemas

These are the properties for the "schemas" top level array property. These schemas are validated both by the [JSON Schema Draft 07 specification](https://json-schema.org/specification-links.html#draft-7), and the DataPM Package file specification. This document contains only the properties listed in the DataPM specification - as they are generally more restrictive than the [JSON Schema Draft 07 specification](https://json-schema.org/specification-links.html#draft-7).

| Property               |   Type   | Required | Description                                                                                                                                                              |
| :--------------------- | :------: | :------: | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| parser                 |  Object  | Required | A configuration object describing the parser required for the data. See Parser section below                                                                             |
| properties             |  Object  | Required | See Schema Properties table below                                                                                                                                        |
| byteCount              | Integer  | Optional | The exact or approximate number of bytes in the raw dataset. This should include only the 'values' and not the format, schema, or keys                                   |
| byteCountApproximate   | Boolean  | Optional | Whether the provided byte count is approximate (true) or exact (false). Default is false (exact).                                                                        |
| derivedFrom            | Object[] | Optional | See 'Derived From' properties                                                                                                                                            |
| derivedFromDescription |  String  | Optional | A description, such as a SQL statement, or a human description of what actions were taken to derive the data in this schema.                                             |
| recordsInspectedCount  | Integer  | Optional | The number of records inspected (not just counted) during generating this package.                                                                                       |
| recordCount            | Integer  | Optional | The exact or estimated number of records in the data set. See recordCountPrecision                                                                                       |
| recordCountPrecision   |  String  | Optional | Defines how to consider recordCount value. Either "EXACT", "APPROXIMATE", OR "GREATER_THAN".                                                                             |
| sampleRecords          |  Array   | Optional | Extracted sample records for preview purposes.                                                                                                                           |
| unit                   |  String  | Optional | The noun(s) describing what each record represents. Example for Objects: Person, Location and Time, Point In Time, etc. Example for values: Meters, Degrees Celsius, etc |

## Schema Properties

Please refer to the [Understanding JSON Schema website](https://json-schema.org/understanding-json-schema/) for detailed information on the structure of Draft-07 (7.0) properties.

The DataPM specification only additionally requires that the "type" field is specified.

## Source Properties

These are the properties of the parser property of the top level schema object.

| Property       |   Type   | Required | Description                                                                   |
| :------------- | :------: | :------: | :---------------------------------------------------------------------------- |
| uris           | String[] | Required | An array of URIs from which to fetch the data                                 |
| type           |  String  | Required | The unique identifier for the source implementation.                          |
| configuration  |  Object  | Optional | A plain JSON object with properties as defined by the source implementation.  |
| lastUpdateHash |  String  | Optional | The last update hash provided by the source when generating the package file. |

## Registries

These are the properties for the registry objects in the top level "registries" array property.

| Property    |  Type  | Required | Description                                                                |
| :---------- | :----: | :------: | :------------------------------------------------------------------------- |
| url         | String | Required | The http or https URL that uniquely identifies the datapm registry server. |
| catalogSlug | String | Required | The unique catalogSlug to which this package is published in the registry. |

## Derived From Properties

These are the properties of the 'derivedFrom' object in the schema properties.

| Property         |  Type  | Required | Description                                                                                                                       |
| :--------------- | :----: | :------: | :-------------------------------------------------------------------------------------------------------------------------------- |
| displayName      | String | Required | The user friendly name for the upstream data.                                                                                     |
| schemaIdentifier | Object | EitherOr | See 'Upstream Schema Version Identifier' properties. Must specify either packageIdentifier or url.                                |
| url              | String | EitherOr | The URL either of the upstream data or the website that describes the upstream data.Must specify either packageIdentifier or url. |

## Upstream Schema Version Identifier Properties

Identifies a single package and version. Used in the 'Derived From' property to identify an upstream data package

| Property    |  Type  | Required | Description                                                                                |
| :---------- | :----: | :------: | :----------------------------------------------------------------------------------------- |
| registryURL | String | Required | The base URL of the upstream registry that contains the catalog and package.               |
| catalogSlug | String | Required | The unique catalog slug for the upstream package                                           |
| packageSlug | String | Required | The unique package slug for the upstream package.                                          |
| version     | String | Required | The semantic version formatted version string for the upstream package.                    |
| schemaTitle | String | Required | The upstream schema 'title' property, found in the upstream package file schema definition |

## Contributor Properties

These are the properties for the contributor object in the top level "contributors" array property.

| Property     |  Type  | Required | Description                                                                          |
| :----------- | :----: | :------: | :----------------------------------------------------------------------------------- |
| description  | String | Optional | Description of the person's work on this data.                                       |
| name         | String | Optional | Name of the contributor                                                              |
| emailAddress | String | Optional | Email Address of the contributor                                                     |
| username     | String | Optional | Username of the contributor on the registry to which this package will be published. |
| website      | String | Optional | Website of the contributor                                                           |
