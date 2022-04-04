import chalk from "chalk";
import {
    DerivedFrom,
    DPMConfiguration,
    nameToSlug,
    PackageFile,
    packageSlugValid,
    Properties,
    Schema,
    Source,
    StreamSet,
    ParameterAnswer,
    ParameterType,
    Parameter
} from "datapm-lib";
import { ConnectorDescription } from "../connector/Connector";
import { getConnectorDescriptionByType } from "../connector/ConnectorUtil";
import {
    InspectionResults,
    InspectProgress,
    SourceInspectionContext,
    SourceStreamsInspectionResult,
    StreamSetPreview,
    Source as SourceImplementation
} from "../connector/Source";
import {
    findRepositoryForSourceUri,
    generateSchemasFromSourceStreams,
    getSourcesDescriptions
} from "../connector/SourceUtil";
import { obtainConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration } from "../util/CredentialsUtil";
import { Maybe } from "../util/Maybe";
import { Job, JobContext, JobResult } from "./Task";
import * as SchemaUtil from "../util/SchemaUtil";
import { validPackageDisplayName, validShortPackageDescription, validUnit, validVersion } from "../util/IdentifierUtil";
import { JSONSchema7TypeName } from "json-schema";
import numeral from "numeral";
import { PackageFileWithContext } from "../main";

// eslint-disable-next-line @typescript-eslint/no-empty-interface
export interface PackageJobResult {
    packageFileLocation: string;
    readmeFileLocation: string | undefined;
    licenseFileLocation: string | undefined;
}

export class PackageJobArguments {
    defaults?: boolean;
    connection?: string;
    credentials?: string;
    configuration?: string;
    references?: string[];
    catalogSlug?: string;
    repositoryIdentifier?: string;
    credentialsIdentifier?: string;
    inspectionSeconds?: number;
}

export class PackageJob extends Job<PackageJobResult> {
    constructor(private jobContext: JobContext, private args: PackageJobArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<PackageJobResult>> {
        let connectionConfiguration: DPMConfiguration = {};
        let credentialsConfiguration: DPMConfiguration = {};
        let sourceConfiguration: DPMConfiguration = {};

        if (this.args.connection) {
            try {
                const correctJson = this.args.connection.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');

                connectionConfiguration = JSON.parse(correctJson);
            } catch (error) {
                this.jobContext.print("ERROR", "Could not parse the connection parameter as JSON");
                return { exitCode: 1 };
            }
        }

        if (this.args.credentials) {
            try {
                const correctJson = this.args.credentials.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');

                credentialsConfiguration = JSON.parse(correctJson);
            } catch (error) {
                this.jobContext.print("ERROR", "Could not parse the credentials parameter as JSON");
                return { exitCode: 1 };
            }
        }

        if (this.args.configuration) {
            try {
                const correctJson = this.args.configuration.replace(/(['"])?([a-z0-9A-Z_]+)(['"])?:/g, '"$2": ');

                sourceConfiguration = JSON.parse(correctJson);
            } catch (error) {
                this.jobContext.print("ERROR", "Could not parse the configuration parameter as JSON");
                return { exitCode: 1 };
            }
        }

        // Inspecting source

        let maybeConnectorDescription: Maybe<ConnectorDescription>;

        if (this.args.references == null || this.args.references.length === 0) {
            const urlsPromptResult = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoComplete,
                    name: "source",
                    configuration: {},
                    message: "Source?",
                    options: (await getSourcesDescriptions())
                        .sort((a, b) => a.sourceType().localeCompare(b.sourceType()))
                        .map((s) => {
                            return { value: s.sourceType(), title: s.getDisplayName() };
                        })
                        .sort((a, b) => a.title.localeCompare(b.title))
                }
            ]);
            maybeConnectorDescription = getConnectorDescriptionByType(urlsPromptResult.source) || null;
        } else {
            let uris = [];
            if (Array.isArray(this.args.references)) {
                uris = this.args.references;
            } else {
                uris = [this.args.references];
            }

            connectionConfiguration.uris = uris;
            try {
                maybeConnectorDescription = (await findRepositoryForSourceUri(uris[0])) || null;
            } catch (error) {
                console.error(error);
                this.jobContext.print("ERROR", "No source implementation found to inspect this data - " + uris[0]);
                return {
                    exitCode: 1
                };
            }
        }

        if (maybeConnectorDescription == null) {
            this.jobContext.print("ERROR", "No repository implementation found to inspect this data ");
            return { exitCode: 1 };
        }

        const connector = await maybeConnectorDescription.getConnector();
        const sourceDescription = await maybeConnectorDescription.getSourceDescription();

        if (sourceDescription == null) {
            this.jobContext.print(
                "ERROR",
                "No source impelementation found for " + maybeConnectorDescription.getType()
            );
            return { exitCode: 1 };
        }

        const connectionConfigurationResults = await obtainConnectionConfiguration(
            this.jobContext,
            connector,
            connectionConfiguration,
            this.args.repositoryIdentifier,
            this.args.defaults
        );

        if (connectionConfigurationResults === false) {
            return { exitCode: 1 };
        }
        connectionConfiguration = connectionConfigurationResults.connectionConfiguration;

        const credentialsConfigurationResults = await obtainCredentialsConfiguration(
            this.jobContext,
            connector,
            connectionConfiguration,
            credentialsConfiguration,
            false,
            this.args.credentialsIdentifier,
            this.args.defaults
        );

        if (credentialsConfigurationResults === false) {
            return { exitCode: 1 };
        }

        credentialsConfiguration = credentialsConfigurationResults.credentialsConfiguration;

        const source = await sourceDescription.getSource();

        const sourceInspectionContext: SourceInspectionContext = {
            defaults: this.args.defaults || false,
            quiet: false,
            jobContext: this.jobContext,
            print: (message: string) => {
                this.jobContext.print("NONE", message);
            },
            parameterPrompt: async (parameters) => {
                return this.jobContext.parameterPrompt(parameters);
            }
        };

        this.jobContext.setCurrentStep(chalk.magenta("Finding Stream Sets"));

        const uriInspectionResults = await inspectSource(
            source,
            sourceInspectionContext,
            this.jobContext,
            connectionConfiguration,
            credentialsConfiguration,
            sourceConfiguration
        );

        this.jobContext.print("SUCCESS", "Found " + uriInspectionResults.streamSetPreviews.length + " stream sets ");

        const schemas: Record<string, Schema> = {};

        const streamSets: StreamSet[] = [];

        this.jobContext.setCurrentStep(chalk.magenta("Inspecting Stream Sets"));
        this.jobContext.print(
            "INFO",
            "Connecting to " + (await connector.getRepositoryIdentifierFromConfiguration(connectionConfiguration))
        );

        for (const streamSetPreview of uriInspectionResults.streamSetPreviews) {
            const task = await this.jobContext.startTask("Inspecting Stream Set " + streamSetPreview.slug);
            const sourceStreamInspectionResults = await inspectStreamSet(
                streamSetPreview,
                sourceInspectionContext,
                this.jobContext,
                sourceConfiguration,
                this.args.inspectionSeconds || 30
            );

            await task.end(
                "SUCCESS",
                "Found " +
                    sourceStreamInspectionResults.schemas.length +
                    " schemas in stream set" +
                    streamSetPreview.slug
            );

            sourceStreamInspectionResults.schemas.forEach((schema) => {
                if (schema.title == null || schema.title === "") throw new Error("SCHEMA_HAS_NO_TITLE");

                schemas[schema.title] = schema;

                schema.properties = filterBadSchemaProperties(schema);
            });

            this.jobContext.print("NONE", "");
            const streamSet: StreamSet = {
                slug: streamSetPreview.slug,
                configuration: streamSetPreview.configuration,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                schemaTitles: sourceStreamInspectionResults.schemas.map((s) => s.title!),
                streamStats: sourceStreamInspectionResults.streamStats
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
            this.jobContext.print("ERROR", "No schemas found");
            return { exitCode: 1 };
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
            this.jobContext.print("ERROR", "No schemas found with properties");
            return { exitCode: 1 };
        }

        for (const key of Object.keys(schemas)) {
            const schema = schemas[key];

            if (schema.properties == null || Object.keys(schema.properties).length === 0) {
                delete schemas[key];
                continue;
            }

            if (!this.args.defaults) await schemaSpecificQuestions(this.jobContext, schema);
        }

        // Prompt Display Name
        let displayNameResponse: ParameterAnswer<"displayName">;
        if (this.args.defaults) {
            displayNameResponse = {
                displayName: uriInspectionResults.defaultDisplayName
            };
            const validateResult = validPackageDisplayName(displayNameResponse.displayName);
            if (validateResult !== true) {
                this.jobContext.print("NONE", chalk.red(validateResult));
                return { exitCode: 1 };
            }
            this.jobContext.print("NONE", `Default user friendly package name: ${displayNameResponse.displayName}`);
        } else {
            this.jobContext.print("NONE", "");
            this.jobContext.print("NONE", chalk.magenta("Package Details"));
            displayNameResponse = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    configuration: {},
                    name: "displayName",
                    message: "User friendly package name?",
                    validate: validPackageDisplayName
                }
            ]);
        }

        // Prompt Package Slug, Version, Description
        const suggestedSlug = nameToSlug(displayNameResponse.displayName as string);

        let responses: ParameterAnswer<"packageSlug" | "version" | "description" | "website" | "sampleRecordCount">;

        if (this.args.defaults) {
            responses = {
                packageSlug: suggestedSlug,
                version: "1.0.0",
                description: `Generated from ${this.args.references}`,
                website: "", // TODO - Better websites defaults. Handle github, etc,
                sampleRecordCount: 100
            };
            this.jobContext.print("NONE", `Default package short name: ${responses.packageSlug}`);
            this.jobContext.print("NONE", `Default starting version: ${responses.version}`);
            this.jobContext.print("NONE", `Default short package description: ${responses.description}`);
        } else {
            responses = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    name: "packageSlug",
                    configuration: {},
                    message: "Package short name?",
                    defaultValue: suggestedSlug,
                    validate: (value) => {
                        if (typeof value !== "string") {
                            return "Must be a string";
                        }

                        const slugValid = packageSlugValid(value);

                        if (slugValid === "PACKAGE_SLUG_INVALID") {
                            return "Must include only letters, numbers, periods, underscores, and hyphens";
                        } else if (slugValid === "PACKAGE_SLUG_REQUIRED") {
                            return "A slug is required";
                        } else if (slugValid === "PACKAGE_SLUG_TOO_LONG") {
                            return "Must be less than 39 charaters";
                        }

                        return true;
                    }
                },
                {
                    type: ParameterType.Text,
                    name: "version",
                    configuration: {},
                    message: "Starting version?",
                    defaultValue: "1.0.0",
                    validate: validVersion
                },
                {
                    type: ParameterType.Text,
                    name: "description",
                    configuration: {},
                    message: "Short package description?",
                    validate: validShortPackageDescription
                },
                {
                    type: ParameterType.Text,
                    name: "website",
                    configuration: {},
                    message: "Website?",
                    validate: validUrl
                },
                {
                    type: ParameterType.Number,
                    name: "sampleRecordCount",
                    message: "Number of sample records?",
                    configuration: {},
                    defaultValue: 100,
                    validate: validSampleRecordCount
                }
            ]);
        }

        for (const schema of Object.values(schemas)) {
            if (responses.sampleRecordCount > 0) {
                if (schema.sampleRecords)
                    schema.sampleRecords = schema.sampleRecords.splice(0, responses.sampleRecordCount);
            } else {
                delete schema.sampleRecords;
            }
        }

        // Writing Package, ReadMe, License Files
        const packageFile: PackageFile = {
            $schema: new PackageFile().$schema,
            canonical: true,
            sources: [sourceObject],
            generatedBy:
                "`datapm package` command. Visit datapm.io to learn about the tools and to discover other data packages",
            updatedDate: new Date(),
            displayName: displayNameResponse.displayName,
            packageSlug: responses.packageSlug,
            version: responses.version,
            description: responses.description,
            readmeFile: `${responses.packageSlug}.README.md`,
            licenseFile: `${responses.packageSlug}.LICENSE.md`,
            website: responses.website,
            schemas: Object.values(schemas)
        };

        this.jobContext.setCurrentStep("Saving Package");
        const packageFileWithContext: PackageFileWithContext = await this.jobContext.saveNewPackageFile(
            this.args.catalogSlug,
            packageFile
        );

        return {
            exitCode: 0,

            result: {
                packageFileLocation: packageFileWithContext.packageFileUrl,
                readmeFileLocation: packageFileWithContext.readmeFileUrl,
                licenseFileLocation: packageFileWithContext.licenseFileUrl
            }
        };
    }
}

export function filterBadSchemaProperties(schema: Schema): Properties | undefined {
    if (schema.properties != null) {
        return Object.fromEntries(Object.entries(schema.properties).filter(([t]) => t != null && t !== ""));
    }

    return undefined;
}

/** Inspect a one or more URIs, with a given config, and implementation. This is generally one schema */
export async function inspectSource(
    source: SourceImplementation,
    sourceInspectionContext: SourceInspectionContext,
    jobContext: JobContext,
    connectionConfiguration: DPMConfiguration,
    credentialsConfiguration: DPMConfiguration,
    configuration: DPMConfiguration
): Promise<InspectionResults> {
    // Inspecting URL
    const uriInspectionResults = await source.inspectURIs(
        connectionConfiguration,
        credentialsConfiguration,
        configuration,
        sourceInspectionContext
    );

    return uriInspectionResults;
}

export async function inspectStreamSet(
    streamSetPreview: StreamSetPreview,
    sourceInspectionContext: SourceInspectionContext,
    jobContext: JobContext,
    sourceConfiguration: DPMConfiguration,
    inspectionSeconds: number
): Promise<SourceStreamsInspectionResult> {
    // Parsing file content

    // TODO For the UpdateCommand, allow below to incrementally inspect the newly available data
    // and update the existing stats - rather than over writting the states every time with the latest
    // from the beginning of the stream.

    const bytesTotal = streamSetPreview.expectedBytesTotal || 0;
    const recordsTotal = streamSetPreview.expectedRecordsTotal || 0;

    if (bytesTotal) {
        jobContext.print("INFO", `Expecting ${numeral(bytesTotal).format("0.0 b")}`);
    } else if (recordsTotal) {
        jobContext.print("INFO", `Expecting ${numeral(recordsTotal).format("0,0a")} records`);
    }

    const task = await jobContext.startTask("Inspecting stream set...");
    const progressText = function (progress: InspectProgress) {
        let text = "Inspecting records...\n";
        const recordsCountedString = numeral(progress.recordCount).format("0,0a");
        const recordsPerSecondString = numeral(progress.recordsPerSecond).format("0,0a");
        const recordsInspectedString = numeral(progress.recordsInspectedCount).format("0,0a");
        const bytesProcessedString = numeral(progress.bytesProcessed).format("0.0b");
        const secondsRemaining = numeral(progress.msRemaining / 1000).format("0a");

        if (progress.recordCount !== progress.recordsInspectedCount) {
            text += `- ${recordsCountedString} records counted\n`;
        }
        text += `- ${recordsInspectedString} records inspected\n`;

        if (progress.bytesProcessed > 0) text += `- ${bytesProcessedString} processed\n`;
        text += `- ${recordsPerSecondString} records/second\n\n`;

        if (!progress.final) {
            text += chalk.gray(`${secondsRemaining} seconds remaining\n`);
            text += chalk.gray("Press Ctrl+C to stop inspecting");
        }

        return text;
    };

    try {
        const inspectionResults = await generateSchemasFromSourceStreams(
            streamSetPreview,
            {
                onStart: (streamName: string) => {
                    task.setMessage(`Inspecting ${streamName}...`);
                },
                onProgress: (progress: InspectProgress) => {
                    task.setMessage(progressText(progress));
                },
                onComplete: async (progress: InspectProgress) => {
                    await task.end("SUCCESS", progressText(progress));
                }
            },
            sourceInspectionContext,
            sourceConfiguration,
            inspectionSeconds
        );
        return inspectionResults;
    } catch (error) {
        await task.end("ERROR", error.message);
        throw error;
    }
}

function validUrl(value: string[] | string | number | boolean): true | string {
    if (typeof value !== "string") {
        return "Must be a string";
    }

    if (value === "") return true;

    if (!value.startsWith("http://") && !value.startsWith("https://")) {
        return "Must start with http:// or https://";
    }

    if (value.length < 10) {
        return "Not a valid URL - not long enough";
    }

    return true;
}

function validSampleRecordCount(value: string[] | number | string | boolean, parameter: Parameter): true | string {
    if (value === "" && parameter.defaultValue != null) return true;

    if (typeof value === "string") return "Must be a number";

    if (typeof value === "boolean") return "Must be a boolean";

    if (Array.isArray(value)) {
        return "Must be a number";
    }

    if (value == null) return "Number, 0 to 100, required";
    if (value > 100) return "Number less than 100 required";
    return true;
}

async function schemaSpecificQuestions(jobContext: JobContext, schema: Schema) {
    jobContext.setCurrentStep(`${schema.title} Schema Details`);

    SchemaUtil.printSchema(jobContext, schema);

    let properties = schema.properties as Properties;
    // Ignore Attributes
    const ignoreAttributesResponse = await jobContext.parameterPrompt([
        {
            type: ParameterType.AutoComplete,
            name: "ignoreAttributes",
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
    if (ignoreAttributesResponse.ignoreAttributes !== "No") {
        const attributesToIgnoreResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.MultiSelect,
                name: "attributesToIgnore",
                configuration: {},
                message: "Attributes to exclude?",
                options: Object.keys(schema.properties as Properties).map((attributeName) => ({
                    title: attributeName,
                    value: attributeName
                }))
            }
        ]);

        attributesToIgnoreResponse.attributesToIgnore.forEach((attributeName: string) => {
            properties[attributeName].hidden = true;
        });
    }

    // Rename Attributes
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
                    selected: true
                },
                {
                    title: "Yes",
                    value: true
                }
            ]
        }
    ]);
    if (renameAttributesResponse.renameAttributes !== "No") {
        const attributeNameMap: Record<string, string> = {};
        const attributesToRenameResponse = await jobContext.parameterPrompt([
            {
                type: ParameterType.MultiSelect,
                name: "attributesToRename",
                message: "Attributes to rename?",
                configuration: {},
                options: Object.keys(schema.properties as Properties).map((attributeName) => ({
                    title: attributeName,
                    value: attributeName
                }))
            }
        ]);
        for (const attributeName of attributesToRenameResponse.attributesToRename) {
            const attributeToRenameResponse = await jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    name: "attributeToRename",
                    configuration: {},
                    message: `New attribute name for "${attributeName}"?`
                }
            ]);
            attributeNameMap[attributeName] = attributeToRenameResponse.attributeToRename;
        }
        attributesToRenameResponse.attributesToRename.forEach((attributeName: string) => {
            const newAttributeName = attributeNameMap[attributeName];
            properties[attributeName].title = newAttributeName;
            if (schema.sampleRecords) {
                schema.sampleRecords.forEach((record) => {
                    record[newAttributeName] = record[attributeName];
                    delete record[attributeName];
                });
            }
        });
    }

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
