import { DerivedFrom, DPMConfiguration, ParameterType, Properties, Schema, Source, StreamSet } from "datapm-lib";
import { ConnectorDescription } from "../connector/Connector";
import { filterBadSchemaProperties, InspectionResults, inspectSource, inspectStreamSet, JobContext } from "../main";
import { obtainConnectionConfiguration } from "./ConnectionUtil";
import { obtainCredentialsConfiguration } from "./CredentialsUtil";
import * as SchemaUtil from "../util/SchemaUtil";
import { JSONSchema7TypeName } from "json-schema";
import { validUnit } from "./IdentifierUtil";

export async function configureSource(
    jobContext: JobContext,
    connectorDescription: ConnectorDescription,
    connectionConfiguration: DPMConfiguration,
    credentialsConfiguration: DPMConfiguration,
    sourceConfiguration: DPMConfiguration,
    repositoryIdentifier: string | undefined,
    credentialsIdentifier: string | undefined,
    inspectionSeconds = 30,
    includePackagingQuestions = true,
    excludedSchemaProperties: ExcludeSchemaProperties = {},
    renamedSchemaProperties: RenameSchemaProperties = {}
): Promise<{ source: Source; inspectionResults: InspectionResults; filteredSchemas: Record<string, Schema> } | false> {
    const connector = await connectorDescription.getConnector();
    const sourceDescription = await connectorDescription.getSourceDescription();

    if (sourceDescription == null) {
        jobContext.print("ERROR", "No source implementation found for " + connectorDescription.getType());
        return false;
    }

    const connectionConfigurationResults = await obtainConnectionConfiguration(
        jobContext,
        connector,
        connectionConfiguration,
        repositoryIdentifier,
        jobContext.useDefaults()
    );

    if (connectionConfigurationResults === false) {
        return false;
    }
    connectionConfiguration = connectionConfigurationResults.connectionConfiguration;

    const credentialsConfigurationResults = await obtainCredentialsConfiguration(
        jobContext,
        connector,
        connectionConfiguration,
        credentialsConfiguration,
        false,
        credentialsIdentifier,
        jobContext.useDefaults()
    );

    if (credentialsConfigurationResults === false) {
        return false;
    }

    credentialsConfiguration = credentialsConfigurationResults.credentialsConfiguration;

    const source = await sourceDescription.getSource();

    jobContext.setCurrentStep("Finding Stream Sets");

    const sourceInspectionResults = await inspectSource(
        source,
        jobContext,
        connectionConfiguration,
        credentialsConfiguration,
        sourceConfiguration
    );

    jobContext.print("SUCCESS", "Found " + sourceInspectionResults.streamSetPreviews.length + " stream sets ");

    const schemas: Record<string, Schema> = {};

    const streamSets: StreamSet[] = [];

    jobContext.setCurrentStep("Inspecting Stream Sets");
    jobContext.print(
        "INFO",
        "Connecting to " + (await connector.getRepositoryIdentifierFromConfiguration(connectionConfiguration))
    );

    for (const streamSetPreview of sourceInspectionResults.streamSetPreviews) {
        const task = await jobContext.startTask("Inspecting Stream Set " + streamSetPreview.slug);
        const sourceStreamInspectionResults = await inspectStreamSet(
            streamSetPreview,
            jobContext,
            sourceConfiguration,
            inspectionSeconds || 30
        );

        await task.end(
            "SUCCESS",
            "Found " + sourceStreamInspectionResults.schemas.length + " schemas in stream set" + streamSetPreview.slug
        );

        sourceStreamInspectionResults.schemas.forEach((schema) => {
            if (schema.title == null || schema.title === "") throw new Error("SCHEMA_HAS_NO_TITLE");

            schemas[schema.title] = schema;

            schema.properties = filterBadSchemaProperties(schema);
        });

        jobContext.print("NONE", "");
        const streamSet: StreamSet = {
            slug: streamSetPreview.slug,
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            schemaTitles: sourceStreamInspectionResults.schemas.map((s) => s.title!),
            streamStats: sourceStreamInspectionResults.streamStats,
            updateMethods: sourceStreamInspectionResults.updateMethods
        };

        streamSets.push(streamSet);
    }

    const sourceObject: Source = {
        slug: source.sourceType(),
        streamSets,
        type: source.sourceType(),
        connectionConfiguration,
        configuration: sourceConfiguration
    };

    if (Object.keys(schemas).length === 0) {
        jobContext.print("ERROR", "No schemas found");
        return false;
    }

    if (
        Object.values(schemas).find((s) => {
            const properties = s.properties;

            if (properties == null) {
                return false;
            }

            if (Object.keys(properties).length === 0) {
                return false;
            }

            return true;
        }) == null
    ) {
        jobContext.print("ERROR", "No schemas found with properties");
        return false;
    }

    for (const key of Object.keys(schemas)) {
        const schema = schemas[key];

        if (schema.properties == null || Object.keys(schema.properties).length === 0) {
            delete schemas[key];
            continue;
        }

        jobContext.setCurrentStep(`${schema.title} Schema Details`);

        SchemaUtil.printSchema(jobContext, schema);

        if (includePackagingQuestions && !jobContext.useDefaults()) {
            await excludeSchemaPropertyQuestions(jobContext, schema, excludedSchemaProperties);
            await renameSchemaPropertyQuestions(jobContext, schema, renamedSchemaProperties);
            await schemaSpecificQuestions(jobContext, schema);
        }
    }

    return {
        filteredSchemas: schemas,
        source: sourceObject,
        inspectionResults: sourceInspectionResults
    };
}

type ExcludeSchemaProperties = { [schemaTitle: string]: string[] };
type RenameSchemaProperties = { [schemaTitle: string]: { [propertyTitle: string]: string } };

/** Modifies the schema and the excludedSchemaProperties arguments
 */
export async function excludeSchemaPropertyQuestions(
    jobContext: JobContext,
    schema: Schema,
    excludeSchemaProperties: ExcludeSchemaProperties = {}
): Promise<void> {
    const properties = schema.properties as Properties;

    if (!jobContext.useDefaults() && Object.keys(excludeSchemaProperties || {}).length === 0) {
        let promptExcludeProperties = false;

        // Ignore Attributes
        const excludeAttributesResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.AutoComplete,
                name: "excludeProperties",
                configuration: {},
                message: `Exclude any attributes from ${schema.title}?`,
                options: [
                    {
                        title: "No",
                        value: false,
                        selected: true
                    },
                    {
                        title: "Yes",
                        value: true
                    }
                ]
            }
        ]);
        promptExcludeProperties = excludeAttributesResponse.excludeProperties === true;

        if (promptExcludeProperties) {
            const propertiesToExcludeResponse = await jobContext.parameterPrompt([
                {
                    type: ParameterType.MultiSelect,
                    name: "attributesToExclude",
                    configuration: {},
                    message: "Attributes to exclude?",
                    options: Object.keys(schema.properties as Properties).map((attributeName) => ({
                        title: attributeName,
                        value: attributeName,
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        selected: excludeSchemaProperties?.[schema.title!]?.includes(attributeName) ?? false
                    }))
                }
            ]);

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            excludeSchemaProperties![schema.title!] = propertiesToExcludeResponse.attributesToExclude;
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    excludeSchemaProperties[schema.title!].forEach((attributeName: string) => {
        properties[attributeName].hidden = true;
    });
}

/** Modifies the schema and the excludedSchemaProperties arguments
 */
export async function renameSchemaPropertyQuestions(
    jobContext: JobContext,
    schema: Schema,
    renameSchemaProperties: RenameSchemaProperties = {}
): Promise<void> {
    const properties = schema.properties as Properties;

    let promptToRenameAttributes = false;

    if (!jobContext.useDefaults() && Object.keys(renameSchemaProperties || {}).length === 0) {
        const renameAttributesResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.AutoComplete,
                name: "renameAttributes",
                configuration: {},
                message: `Rename attributes from ${schema.title}?`,
                options: [
                    {
                        title: "No",
                        value: false,
                        selected: Object.keys(renameSchemaProperties || {}).length === 0
                    },
                    {
                        title: "Yes",
                        value: true,
                        selected: Object.keys(renameSchemaProperties || {}).length >= 0
                    }
                ]
            }
        ]);

        promptToRenameAttributes = renameAttributesResponse.renameAttributes !== "No";

        if (promptToRenameAttributes) {
            const attributeNameMap: Record<string, string> = {};
            const attributesToRenameResponse = await jobContext.parameterPrompt([
                {
                    type: ParameterType.MultiSelect,
                    name: "attributesToRename",
                    message: "Attributes to rename?",
                    configuration: {},
                    options: Object.keys(schema.properties as Properties).map((attributeName) => ({
                        title: attributeName,
                        value: attributeName,
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        selected: renameSchemaProperties?.[schema.title!]?.[attributeName] != null
                    }))
                }
            ]);
            for (const attributeName of attributesToRenameResponse.attributesToRename) {
                const attributeToRenameResponse = await jobContext.parameterPrompt([
                    {
                        type: ParameterType.Text,
                        name: "attributeToRename",
                        configuration: {},
                        message: `New attribute name for "${attributeName}"?`,
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        defaultValue: renameSchemaProperties?.[schema.title!]?.[attributeName] ?? attributeName
                    }
                ]);
                attributeNameMap[attributeName] = attributeToRenameResponse.attributeToRename;
            }

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            renameSchemaProperties[schema.title!] = {};

            attributesToRenameResponse.attributesToRename.forEach((attributeName: string) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                renameSchemaProperties[schema.title!][attributeName] = attributeNameMap[attributeName];
            });
        }
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    Object.keys(renameSchemaProperties[schema.title!]).forEach((attributeName: string) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const newAttributeName = renameSchemaProperties[schema.title!][attributeName];
        properties[attributeName].title = newAttributeName;
        if (schema.sampleRecords) {
            schema.sampleRecords.forEach((record) => {
                record[newAttributeName] = record[attributeName];
                delete record[attributeName];
            });
        }
    });
}

async function schemaSpecificQuestions(jobContext: JobContext, schema: Schema) {
    let properties = schema.properties as Properties;

    // Derived from
    const derivedFrom: DerivedFrom[] = [];

    while (true) {
        const message =
            derivedFrom.length === 0
                ? `Was ${schema.title} derived from other 'upstream data'?`
                : `Was ${schema.title} derived from additional 'upstream data'?`;
        const wasDerivedResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.AutoComplete,
                name: "wasDerived",
                message: message,
                configuration: {},
                options: [
                    { title: "No", value: false, selected: true },
                    {
                        title: "Yes",
                        value: true
                    }
                ]
            }
        ]);

        if (wasDerivedResponse.wasDerived === "No") break;

        const derivedFromUrlResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.Text,
                name: "url",
                configuration: {},
                message: "URL for the 'upstream data'?",
                hint: "Leave blank to end"
            }
        ]);

        if (derivedFromUrlResponse.url !== "") {
            // get the title
            const displayName = "";

            const derivedFromUrlDisplayNameResponse = await jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    configuration: {},
                    name: "displayName",
                    message: "Name of data from above URL?",
                    defaultValue: displayName
                }
            ]);

            derivedFrom.push({
                url: derivedFromUrlResponse.url,
                displayName: derivedFromUrlDisplayNameResponse.displayName
            });
        } else {
            break;
        }
    }

    let derivedFromDescription = "";

    if (derivedFrom.length > 0) {
        const derivedFromDescriptionResponse = await jobContext.parameterPrompt([
            {
                name: "description",
                type: ParameterType.Text,
                message: "What SQL or other process was used to derive this data?",
                configuration: {},
                validate: (value: string[] | string | number | boolean) => {
                    if (typeof value !== "string") {
                        return "Must be a string";
                    }

                    if (value.length === 0) return "A description is required.";

                    return true;
                }
            }
        ]);

        derivedFromDescription = derivedFromDescriptionResponse.description;

        schema.derivedFrom = derivedFrom;
        schema.derivedFromDescription = derivedFromDescription;
    }

    const recordUnitResponse = await jobContext.parameterPrompt([
        {
            type: ParameterType.Text,
            name: "recordUnit",
            configuration: {},
            message: `What does each ${schema.title} record represent?`,
            validate: validUnit
        }
    ]);
    if (recordUnitResponse.recordUnit) {
        schema.unit = recordUnitResponse.recordUnit;
    }
    // Prompt Column Unit per "number" Type Column
    properties = schema.properties as Properties;

    const keys = Object.keys(properties).filter((key) => {
        const property = properties[key] as Schema;
        const type = property.type as JSONSchema7TypeName[];
        const types = type.filter((type) => type !== "null");
        return types.length === 1 && types[0] === "number";
    });

    let promptForNumberUnits = true;

    if (keys.length >= 3) {
        const confirmContinueResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.AutoComplete,
                name: "confirm",
                message: `Do you want to specify units for the ${keys.length} number properties?`,
                configuration: {},
                options: [
                    {
                        title: "No",
                        value: false
                    },
                    {
                        title: "Yes",
                        value: true
                    }
                ]
            }
        ]);
        if (confirmContinueResponse.confirm !== true) {
            promptForNumberUnits = false;
        }
    }

    if (promptForNumberUnits) {
        for (const key of keys) {
            const property = properties[key] as Schema;
            const columnUnitResponse = await jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    name: "columnUnit",
                    configuration: {},
                    message: `Unit for attribute '${property.title}'?`,
                    validate: validUnit
                }
            ]);
            if (columnUnitResponse.columnUnit) {
                property.unit = columnUnitResponse.columnUnit;
            }
        }
    }
}
