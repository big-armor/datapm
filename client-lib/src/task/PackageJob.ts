import chalk from "chalk";
import {
    DPMConfiguration,
    nameToSlug,
    PackageFile,
    packageSlugValid,
    Properties,
    Schema,
    Source,
    ParameterAnswer,
    ParameterType,
    Parameter
} from "datapm-lib";
import { ConnectorDescription } from "../connector/Connector";
import { getConnectorDescriptionByType } from "../connector/ConnectorUtil";
import {
    InspectionResults,
    InspectProgress,
    SourceStreamsInspectionResult,
    StreamSetPreview,
    Source as SourceImplementation
} from "../connector/Source";
import {
    findRepositoryForSourceUri,
    generateSchemasFromSourceStreams,
    getSourcesDescriptions
} from "../connector/SourceUtil";
import { Maybe } from "../util/Maybe";
import { Job, JobResult } from "./Task";
import { JobContext } from "./JobContext";
import { validPackageDisplayName, validShortPackageDescription, validVersion } from "../util/IdentifierUtil";
import numeral from "numeral";
import { PackageFileWithContext } from "../main";
import { configureSource, ConfigureSourceResponse } from "../util/SourceInspectionUtil";

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
    packageTitle?: string;
    packageSlug?: string;
    version?: string;
    description?: string;
    website?: string;
    sampleRecordCount?: number;
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
                    defaultValue: "http",
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

        if (maybeConnectorDescription == null) {
            this.jobContext.print("ERROR", "No connector implementation found to inspect this data ");
            return { exitCode: 1 };
        }

        const packageIdentifier =
            this.args.packageSlug && this.args.catalogSlug
                ? {
                      catalogSlug: this.args.catalogSlug,
                      packageSlug: this.args.packageSlug
                  }
                : undefined;

        let configureSourceResults: ConfigureSourceResponse;

        try {
            configureSourceResults = await configureSource(
                this.jobContext,
                packageIdentifier,
                maybeConnectorDescription,
                connectionConfiguration,
                credentialsConfiguration,
                sourceConfiguration,
                this.args.repositoryIdentifier,
                this.args.credentialsIdentifier,
                this.args.inspectionSeconds,
                true
            );
        } catch (error) {
            return { exitCode: 1, errorMessage: error.message };
        }

        if (configureSourceResults === false) {
            return { exitCode: 1 };
        }

        const sourceInspectionResults = configureSourceResults.inspectionResults;
        const schemas = configureSourceResults.filteredSchemas;
        const sourceObject = configureSourceResults.source;

        // Prompt Display Name
        let displayNameResponse: ParameterAnswer<"displayName">;
        if (this.args.packageTitle != null) {
            displayNameResponse = {
                displayName: this.args.packageTitle
            };
        } else if (this.args.defaults) {
            displayNameResponse = {
                displayName: sourceInspectionResults.defaultDisplayName
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
                packageSlug: this.args.packageSlug ?? suggestedSlug,
                version: this.args.version ?? "1.0.0",
                description: this.args.description ?? `Generated from ${this.args.references}`,
                website: this.args.website ?? "", // TODO - Better websites defaults. Handle github, etc,
                sampleRecordCount: Math.max(this.args.sampleRecordCount ?? 100, 100)
            };
            this.jobContext.print("NONE", `Default package short name: ${responses.packageSlug}`);
            this.jobContext.print("NONE", `Default starting version: ${responses.version}`);
            this.jobContext.print("NONE", `Default short package description: ${responses.description}`);
        } else {
            const shortNameResponse: string =
                this.args.packageSlug ??
                (
                    await this.jobContext.parameterPrompt([
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
                        }
                    ])
                ).packageSlug;

            const versionResponse: string =
                this.args.version ??
                (
                    await this.jobContext.parameterPrompt([
                        {
                            type: ParameterType.Text,
                            name: "version",
                            configuration: {},
                            message: "Starting version?",
                            defaultValue: "1.0.0",
                            validate: validVersion
                        }
                    ])
                ).version;

            const descriptionResponse: string =
                this.args.description ??
                (
                    await this.jobContext.parameterPrompt([
                        {
                            type: ParameterType.Text,
                            name: "description",
                            configuration: {},
                            message: "Short package description?",
                            validate: validShortPackageDescription
                        }
                    ])
                ).description;

            const websiteResponse: string =
                this.args.website ??
                (
                    await this.jobContext.parameterPrompt([
                        {
                            type: ParameterType.Text,
                            name: "website",
                            configuration: {},
                            message: "Website?",
                            validate: validUrl
                        }
                    ])
                ).website;

            const sampleRecordCountResponse: number =
                this.args.sampleRecordCount ??
                (
                    await this.jobContext.parameterPrompt([
                        {
                            type: ParameterType.Number,
                            name: "sampleRecordCount",
                            message: "Number of sample records?",
                            configuration: {},
                            defaultValue: 100,
                            validate: validSampleRecordCount
                        }
                    ])
                ).sampleRecordCount;

            responses = {
                packageSlug: shortNameResponse,
                version: versionResponse,
                description: descriptionResponse,
                website: websiteResponse,
                sampleRecordCount: sampleRecordCountResponse
            };
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
            readmeMarkdown: `# ${displayNameResponse.displayName}\n \n ${responses.description}`,
            licenseMarkdown: "# License\n\nLicense not defined. Contact author.",
            website: responses.website,
            schemas: Object.values(schemas)
        };

        this.jobContext.setCurrentStep("Saving Package");
        const packageFileWithContext: PackageFileWithContext = await this.jobContext.saveNewPackageFile(
            this.args.catalogSlug,
            packageFile
        );

        this.jobContext.print(
            "SUCCESS",
            "Package " +
                packageFileWithContext.packageFile.version +
                " saved to " +
                packageFileWithContext.packageReference
        );

        return {
            exitCode: 0,

            result: {
                packageFileLocation: packageFileWithContext.packageReference,
                readmeFileLocation: packageFileWithContext.readmeFileUrl,
                licenseFileLocation: packageFileWithContext.licenseFileUrl
            }
        };
    }
}

export function filterBadSchemaProperties(schema: Schema): Properties {
    return Object.fromEntries(Object.entries(schema.properties).filter(([t]) => t != null && t !== ""));
}

/** Inspect a one or more URIs, with a given config, and implementation. This is generally one schema */
export async function inspectSource(
    source: SourceImplementation,
    jobContext: JobContext,
    connectionConfiguration: DPMConfiguration,
    credentialsConfiguration: DPMConfiguration,
    configuration: DPMConfiguration
): Promise<InspectionResults> {
    // Inspecting URL
    const uriInspectionResults = await source.inspectData(
        connectionConfiguration,
        credentialsConfiguration,
        configuration,
        jobContext
    );

    return uriInspectionResults;
}

export async function inspectStreamSet(
    source: Source,
    streamSetPreview: StreamSetPreview,
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
        let text = `Inspecting ${progress.currentStreamName}\n`;
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

            // TODO Make this context specific
            text += chalk.gray("Press Ctrl+C to stop inspecting");
        }

        return text;
    };

    try {
        const inspectionResults = await generateSchemasFromSourceStreams(
            source,
            streamSetPreview,
            {
                onStart: (streamName: string) => {
                    task.setMessage(`Connecting to ${streamName}...`);
                },
                onReconnect: (streamName: string) => {
                    task.setMessage(`Reconnecting to ${streamName}...`);
                },
                onProgress: (progress: InspectProgress) => {
                    task.setMessage(progressText(progress));
                },
                onComplete: async (progress: InspectProgress) => {
                    await task.end("SUCCESS", progressText(progress));
                }
            },
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
