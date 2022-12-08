import chalk from "chalk";
import {
    CountPrecision,
    DPMConfiguration,
    leastPrecise,
    PackageFile,
    SinkState,
    SinkStateKey,
    Source,
    ParameterType,
    CATALOG_SLUG_REGEX,
    PACKAGE_SLUG_REGEX,
    CURRENT_PACKAGE_FILE_SCHEMA_URL
} from "datapm-lib";
import ON_DEATH from "death";
import { SemVer } from "semver";
import { getConnectorDescriptionByType, CONNECTORS } from "../connector/ConnectorUtil";
import { Sink } from "../connector/Sink";
import { getSinkDescriptions } from "../connector/SinkUtil";
import { InspectionResults, StreamSetPreview } from "../connector/Source";
import { obtainConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration } from "../util/CredentialsUtil";
import { formatRemainingTime } from "../util/DateUtil";
import { PackageFileWithContext, RegistryPackageFileContext } from "../util/PackageContext";
import { repeatedlyPromptParameters } from "../util/parameters/ParameterUtils";
import { inspectSourceConnection } from "../util/SchemaUtil";
import { fetch, FetchOutcome, FetchResult, FetchStatus, newRecordsAvailable } from "../util/StreamToSinkUtil";
import { Job, JobResult } from "./Task";
import { JobContext } from "./JobContext";
import numeral from "numeral";
import {
    configureSource,
    excludeSchemaPropertyQuestions,
    renameSchemaPropertyQuestions
} from "../util/SourceInspectionUtil";
import { obtainReference } from "../util/ReferenceUtil";

export interface FetchPackageJobResult {
    parameterCount: number;
    sink: Sink;
    sinkCredentialsIdentifier: string | undefined;
    sinkRepositoryIdentifier: string | undefined;
    sinkConnectionConfiguration: DPMConfiguration;
    sinkConfiguration: DPMConfiguration;
    packageFileWithContext: PackageFileWithContext;

    // For fetching a single source outside a package
    sourceConnectionConfiguration: DPMConfiguration;
    sourceConfiguration: DPMConfiguration;
    sourceCredentialsIdentifier: string | undefined;
    sourceRepositoryIdentifier: string | undefined;

    // For fetching from a package that requires additional
    // source configuration
    packageSourceConnectionConfiguration: { [sourceSlug: string]: DPMConfiguration };
    packageSourceCredentialsIdentifiers: { [sourceSlug: string]: string };
    packageSourceConfiguration: { [sourceSlug: string]: DPMConfiguration };

    excludedSchemaProperties: { [key: string]: string[] };
    renamedSchemaProperties: { [key: string]: { [propertyKey: string]: string } };
}

export class FetchArguments {
    reference?: string;
    sinkType?: string;
    defaults?: boolean;
    sinkConfig?: string;
    sinkRepository?: string;
    sinkCredentialsIdentifier?: string;
    sinkConnectionConfig?: string;
    sinkCredentialsConfig?: string;
    quiet?: boolean;
    forceUpdate?: boolean;

    packageSourceConnectionConfig?: string;
    packageSourceCredentialsIdentifiers?: string;
    packageSourceCredentialsConfig?: string;
    packageSourceConfig?: string;

    sourceConnectionConfig?: string;
    sourceCredentialsConfig?: string;
    sourceConfig?: string;
    sourceRepositoryIdentifier?: string;
    sourceCredentialsIdentifier?: string;
    inspectionSeconds?: number;
    excludeSchemaProperties?: string;
    renameSchemaProperties?: string;
}

export class FetchPackageJob extends Job<FetchPackageJobResult> {
    constructor(private jobContext: JobContext, private args: FetchArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<FetchPackageJobResult>> {
        if (this.args.sinkRepository != null && this.args.sinkConnectionConfig != null) {
            throw new Error("Cannot specify both sinkRepository and sinkConnectionConfig");
        }

        if (this.args.sinkCredentialsIdentifier != null && this.args.sinkCredentialsConfig != null) {
            throw new Error("Cannot specify both sinkCredentialsIdentifier and sinkCredentialsConfig");
        }

        let excludedSchemaProperties: { [key: string]: string[] } = {};
        let renamedSchemaProperties: { [key: string]: { [propertyKey: string]: string } } = {};

        if (this.args.excludeSchemaProperties != null) {
            excludedSchemaProperties = JSON.parse(this.args.excludeSchemaProperties);
        }

        if (this.args.renameSchemaProperties != null) {
            renamedSchemaProperties = JSON.parse(this.args.renameSchemaProperties);
        }

        this.jobContext.setCurrentStep("Source Selection");

        if (this.args.reference == null) {
            const referencePromptResult = await obtainReference(
                this.jobContext,
                "Source package or connector name?",
                true
            );

            this.args.reference = referencePromptResult;
        }

        if (this.args.reference == null) throw new Error("The 'reference' value is required");

        let packageFileWithContext: PackageFileWithContext | undefined;

        if (
            this.args.reference.toLowerCase().endsWith(".json") ||
            this.args.reference.startsWith("http") ||
            this.args.reference.startsWith("https") ||
            (this.args.reference.split("/").length === 2 &&
                this.args.reference.split("/")[0].match(CATALOG_SLUG_REGEX) &&
                this.args.reference.split("/")[1].match(PACKAGE_SLUG_REGEX))
        ) {
            // Finding package
            const task = await this.jobContext.startTask("Finding package " + this.args.reference);

            try {
                packageFileWithContext = await this.jobContext.getPackageFile(this.args.reference, "modified");
                task.end("SUCCESS", "Found package " + this.args.reference);
            } catch (error) {
                if (typeof error.message === "string" && error.message.includes("ERROR_SCHEMA_VERSION_TOO_NEW")) {
                    await task.end("ERROR", "The package file was created by a newer version of the datapm client.");

                    this.jobContext.print(
                        "INFO",
                        "Update the datapm client to the latest version to use this package."
                    );
                    this.jobContext.print("NONE", "https://datapm.io/downloads");

                    return {
                        exitCode: 1
                    };
                } else if (typeof error.message === "string" && error.message.includes("CATALOG_NOT_FOUND")) {
                    await task.end("ERROR", "The catalog was not found.");

                    return {
                        exitCode: 1
                    };
                } else if (typeof error.message === "string" && error.message.includes("PACKAGE_NOT_FOUND")) {
                    await task.end("ERROR", "The package was not found.");

                    return {
                        exitCode: 1
                    };
                } else if (typeof error.message === "string" && error.message.includes("NOT_AUTHENTICATED")) {
                    await task.end("ERROR", "You are not logged in to the registry.");

                    this.jobContext.print("INFO", "Use the following command to authenticate.");
                    this.jobContext.print("NONE", chalk.green("datapm registry login"));

                    return {
                        exitCode: 1
                    };
                } else if (typeof error.message === "string" && error.message.includes("NOT_A_PACKAGE_FILE")) {
                    await task.end("SUCCESS", "Not a package file. Will try to find file type.");
                } else {
                    await task.end("ERROR", error.message);
                    return {
                        exitCode: 1
                    };
                }
            }
        }

        // If the package file was not found, we need to create it
        // this assumes the user selected a source connector by its type() value
        if (packageFileWithContext == null) {
            // Prompt parameters
            let sourceConnectionConfiguration: DPMConfiguration = {};
            let sourceCredentialsConfiguration: DPMConfiguration = {};
            let sourceConfiguration: DPMConfiguration = {};

            if (this.args.sourceConnectionConfig) {
                sourceConnectionConfiguration = JSON.parse(this.args.sourceConnectionConfig);
            }

            if (this.args.sourceCredentialsConfig) {
                sourceCredentialsConfiguration = JSON.parse(this.args.sourceCredentialsConfig);
            }

            if (this.args.sourceConfig) {
                sourceConfiguration = JSON.parse(this.args.sourceConfig);
            }

            // find a source connector by reference
            let sourceConnectorDescription = CONNECTORS.filter((c) => c.hasSource()).find(
                (c) => c.getType() === this.args.reference
            );

            if (sourceConnectorDescription == null) {
                for (const testConnector of CONNECTORS.filter((c) => c.hasSource())) {
                    const supportsUri =
                        (await testConnector.getSourceDescription())?.supportsURI(this.args.reference) ?? false;

                    if (supportsUri === false) continue;

                    sourceConnectionConfiguration = {
                        ...supportsUri.connectionConfiguration,
                        ...sourceConnectionConfiguration
                    };

                    sourceCredentialsConfiguration = {
                        ...supportsUri.credentialsConfiguration,
                        ...sourceCredentialsConfiguration
                    };

                    sourceConfiguration = {
                        ...supportsUri.configuration,
                        ...sourceConfiguration
                    };

                    sourceConnectorDescription = testConnector;
                    break;
                }
            } else {
                this.jobContext.print(
                    "SUCCESS",
                    "Using source connector " + sourceConnectorDescription.getDisplayName()
                );
            }

            if (sourceConnectorDescription != null) {
                const configureSourceResults = await configureSource(
                    this.jobContext,
                    undefined,
                    sourceConnectorDescription,
                    sourceConnectionConfiguration,
                    sourceCredentialsConfiguration,
                    sourceConfiguration,
                    this.args.sourceRepositoryIdentifier,
                    this.args.sourceCredentialsIdentifier,
                    this.args.inspectionSeconds,
                    false
                );

                if (configureSourceResults === false) {
                    return { exitCode: 1 };
                }

                const schemas = Object.values(configureSourceResults.filteredSchemas);

                const sourceConector = await sourceConnectorDescription?.getConnector();

                if (sourceConector.requiresCredentialsConfiguration()) {
                    this.args.sourceCredentialsIdentifier = await sourceConector.getCredentialsIdentifierFromConfiguration(
                        sourceConnectionConfiguration,
                        sourceCredentialsConfiguration
                    );

                    if (this.args.sourceCredentialsIdentifier)
                        this.args.packageSourceCredentialsIdentifiers = JSON.stringify({
                            [sourceConector.getType()]: this.args.sourceCredentialsIdentifier
                        });
                }

                this.args.sourceConnectionConfig = JSON.stringify(sourceConnectionConfiguration);
                this.args.sourceConfig = JSON.stringify(sourceConfiguration);

                // Build a temporary in memory package file
                packageFileWithContext = {
                    cantSaveReason: "SAVE_NOT_AVAILABLE",
                    contextType: "temporary",
                    hasPermissionToSave: false,
                    licenseFileUrl: "",
                    readmeFileUrl: "",
                    packageReference: "",
                    permitsSaving: false,
                    save: () => {
                        throw new Error("Save not available");
                    },
                    catalogSlug: "",
                    packageFile: {
                        $schema: CURRENT_PACKAGE_FILE_SCHEMA_URL,
                        canonical: true,
                        description: "temporary package file generated by datapm fetch command",
                        displayName: "Temp Package",
                        generatedBy: "datapm fetch command",
                        packageSlug: "tmp-package",
                        schemas,
                        sources: [configureSourceResults.source],
                        updatedDate: new Date(),
                        version: "0.0.0"
                    }
                };
            }
        }

        if (packageFileWithContext == null) {
            this.jobContext.print(
                "ERROR",
                "Could not find package or source by the reference '" + this.args.reference + "'"
            );
            return {
                exitCode: 1
            };
        }

        const packageFile = packageFileWithContext.packageFile;

        const schemaDescriptionRecordCount = packageFile.schemas
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            .map((s) => s.recordCount!)
            .reduce((prev, curr) => (prev += curr), 0);
        const schemaCount = packageFile.schemas.length;
        const recordCountPrecision = packageFile.schemas
            .map((s) => s.recordCountPrecision)
            .reduce((prev, curr) => {
                if (prev === undefined || curr === undefined) return undefined;

                return leastPrecise(prev, curr);
            });

        let recordCountText = numeral(schemaDescriptionRecordCount).format("0a") + "";
        if (recordCountPrecision === CountPrecision.APPROXIMATE) {
            recordCountText = `approximpately ${recordCountText} `;
        } else if (recordCountPrecision === CountPrecision.GREATER_THAN) {
            recordCountText = `more than ${recordCountText} `;
        }
        recordCountText = `${schemaCount} schemas with ${recordCountText} records`;
        this.jobContext.print("INFO", recordCountText);

        /** PROMPT USER TO EXCLUDE AND RENAME PROPERTIES IN SCHEMAS */

        const excludedSchemaPropertiesDefined = this.args.excludeSchemaProperties != null;
        const renamedSchemaPropertiesDefined = this.args.renameSchemaProperties != null;

        for (const schema of packageFile.schemas) {
            this.jobContext.setCurrentStep(schema.title + " Schema Options");

            await excludeSchemaPropertyQuestions(
                this.jobContext,
                schema,
                excludedSchemaPropertiesDefined, // do not prompt if the exclude properties argument was defined
                excludedSchemaProperties
            );

            if (this.jobContext.useDefaults() || excludedSchemaPropertiesDefined) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                if (Object.values(excludedSchemaProperties[schema.title!] ?? []).length === 0) {
                    this.jobContext.print("SUCCESS", "No properties excluded");
                } else {
                    this.jobContext.print(
                        "SUCCESS",
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        "Will exclude these properties: " + excludedSchemaProperties[schema.title!].join(", ")
                    );
                }
            }

            await renameSchemaPropertyQuestions(
                this.jobContext,
                schema,
                renamedSchemaPropertiesDefined, // do not prompt if the renmaed properties argument was defined
                renamedSchemaProperties
            );

            if (this.jobContext.useDefaults() || renamedSchemaPropertiesDefined) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                if (Object.values(renamedSchemaProperties[schema.title!] ?? {}).length === 0) {
                    this.jobContext.print("SUCCESS", "No properties will be renamed");
                } else {
                    this.jobContext.print(
                        "SUCCESS",
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        "Will rename these properties:"
                    );

                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    for (const propertyKey of Object.keys(renamedSchemaProperties[schema.title!])) {
                        this.jobContext.print(
                            "NONE",
                            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                            `\t${propertyKey} to ${renamedSchemaProperties[schema.title!][propertyKey]}`
                        );
                    }
                }
            }
        }

        /** INSPECT SOURCES */
        const sourcesAndInspectionResults: {
            source: Source;
            inspectionResult: InspectionResults;
        }[] = [];

        // get all user entered source configuration
        const packageSourceConfig: { [sourceSlug: string]: DPMConfiguration } = JSON.parse(
            this.args.packageSourceConfig ?? "{}"
        );

        const packageSourceConnectionConfig: { [sourceSlug: string]: DPMConfiguration } = JSON.parse(
            this.args.packageSourceConnectionConfig ?? "{}"
        );

        // Map of source slugs to credential identifier strings
        const packageSourceCredentialIdentifiers: { [sourceSlug: string]: string } = JSON.parse(
            this.args.packageSourceCredentialsIdentifiers ?? "{}"
        );

        // Map of source slugs to credential configuration objects
        const packageSourceCredentialConfigs: { [sourceSlug: string]: DPMConfiguration } = JSON.parse(
            this.args.packageSourceCredentialsConfig ?? "{}"
        );

        for (const source of packageFile.sources) {
            this.jobContext.setCurrentStep("Inspecting " + source.slug);

            // Apply command argument source configuration
            if (Object.keys(packageSourceConfig).indexOf(source.slug) !== -1) {
                source.configuration = {
                    ...source.configuration,
                    ...packageSourceConfig[source.slug]
                };
            }

            if (packageSourceCredentialIdentifiers[source.slug] != null) {
                source.credentialsIdentifier = packageSourceCredentialIdentifiers[source.slug];
            }

            const sourceCredentials: undefined | DPMConfiguration = packageSourceCredentialConfigs[source.slug];

            const inspectionResult = await inspectSourceConnection(
                this.jobContext,
                packageFileWithContext.catalogSlug
                    ? {
                          catalogSlug: packageFileWithContext.catalogSlug,
                          packageSlug: packageFile.packageSlug
                      }
                    : undefined,
                source,
                sourceCredentials,
                this.args.defaults,
                packageSourceCredentialIdentifiers[source.slug] != null
            );

            if (Object.keys(inspectionResult.additionalConnectionConfiguration).length > 0) {
                packageSourceConnectionConfig[source.slug] = inspectionResult.additionalConnectionConfiguration;
            }

            if (inspectionResult.credentialsIdentifier) {
                packageSourceCredentialIdentifiers[source.slug] = inspectionResult.credentialsIdentifier;
            }

            if (Object.keys(inspectionResult.additionalConfiguration).length > 0) {
                packageSourceConfig[source.slug] = inspectionResult.additionalConfiguration;
            }

            sourcesAndInspectionResults.push({
                source,
                inspectionResult
            });
        }

        this.jobContext.setCurrentStep("Sink Connector");

        // Getting sink
        let sinkType: string;

        if (this.args.sinkType) {
            sinkType = this.args.sinkType;
        } else if (this.args.defaults) {
            sinkType = "file";
        } else {
            const sinkDescriptions = await getSinkDescriptions();

            const sinkPromptResult = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoComplete,
                    configuration: {},
                    name: "type",
                    message: "Sink Connector?",
                    options: sinkDescriptions.map((sink) => {
                        return {
                            title: sink.getDisplayName(),
                            value: sink.getType()
                        };
                    })
                }
            ]);

            sinkType = sinkPromptResult.type;
        }

        if (sinkType == null) {
            throw new Error("Sink type is required");
        }

        // Prompt parameters
        let sinkConnectionConfiguration: DPMConfiguration = {};
        let sinkCredentialsConfiguration: DPMConfiguration = {};
        let sinkConfiguration: DPMConfiguration = {};

        if (this.args.sinkConnectionConfig) {
            try {
                sinkConnectionConfiguration = JSON.parse(this.args.sinkConnectionConfig);
            } catch (error) {
                this.jobContext.print("ERROR", "ERROR_PARSING_SINK_CONNECTION_CONFIG");
                return {
                    exitCode: 1
                };
            }
        }

        if (this.args.sinkCredentialsConfig) {
            try {
                sinkCredentialsConfiguration = JSON.parse(this.args.sinkCredentialsConfig);
            } catch (error) {
                this.jobContext.print("ERROR", "ERROR_PARSING_SINK_CREDENTIALS_CONFIG");
                return {
                    exitCode: 1
                };
            }
        }

        // Finding sink
        const task = await this.jobContext.startTask(`Finding the sink named ${sinkType}`);

        const sinkConnectorDescription = getConnectorDescriptionByType(sinkType);

        if (sinkConnectorDescription == null) throw new Error("Could not find connector for type " + sinkType);

        const sinkConnector = await sinkConnectorDescription?.getConnector();

        if (sinkConnector == null) throw new Error("Could not find repository for " + sinkType);

        await task.end("SUCCESS", `Found the connector named ${sinkType}`);

        const obtainSinkConfigurationResult = await obtainConnectionConfiguration(
            this.jobContext,
            packageFileWithContext.catalogSlug
                ? {
                      catalogSlug: packageFileWithContext.catalogSlug,
                      packageSlug: packageFile.packageSlug
                  }
                : undefined,
            sinkConnector,
            sinkConnectionConfiguration,
            this.args.sinkRepository,
            this.args.defaults
        );

        if (obtainSinkConfigurationResult === false) {
            this.jobContext.print("ERROR", "User canceled");
            return {
                exitCode: 1
            };
        }

        sinkConnectionConfiguration = obtainSinkConfigurationResult.connectionConfiguration;

        const obtainCredentialsConfigurationResult = await obtainCredentialsConfiguration(
            this.jobContext,
            packageFileWithContext.catalogSlug
                ? {
                      catalogSlug: packageFileWithContext.catalogSlug,
                      packageSlug: packageFileWithContext.packageFile.packageSlug
                  }
                : undefined,
            sinkConnector,
            sinkConnectionConfiguration,
            sinkCredentialsConfiguration,
            false,
            this.args.sinkCredentialsIdentifier,
            this.args.defaults
        );

        if (obtainCredentialsConfigurationResult === false) {
            this.jobContext.print("ERROR", "User canceled");
            return {
                exitCode: 1
            };
        }

        sinkCredentialsConfiguration = obtainCredentialsConfigurationResult.credentialsConfiguration;

        const sinkDescription = await sinkConnectorDescription.getSinkDescription();

        if (sinkDescription == null) {
            this.jobContext.print("ERROR", `Could not find sink type: ${sinkType}`);
            return {
                exitCode: 1
            };
        }

        if (this.args.sinkType || this.args.defaults) {
            this.jobContext.print("SUCCESS", `Found the ${sinkDescription.getDisplayName()} sink`);
        }

        if (this.args.sinkConfig) {
            try {
                sinkConfiguration = JSON.parse(this.args.sinkConfig);
            } catch (error) {
                console.log("sink config is: " + this.args.sinkConfig);
                this.jobContext.print("ERROR", "ERROR_PARSING_SINK_CONFIG: " + error.message);
                return {
                    exitCode: 1
                };
            }
        }

        const sink = await sinkDescription.loadSinkFromModule();

        this.jobContext.setCurrentStep(sinkConnectorDescription.getDisplayName() + " Configuration");
        const sinkParameterCount = await repeatedlyPromptParameters(
            this.jobContext,
            async () => {
                return sink.getParameters(
                    (packageFileWithContext as RegistryPackageFileContext).packageObject?.identifier.catalogSlug ||
                        "local",
                    packageFile,
                    sinkConnectionConfiguration,
                    sinkCredentialsConfiguration,
                    sinkConfiguration,
                    this.jobContext
                );
            },
            this.args.defaults || false
        );

        if (sinkParameterCount === 0) {
            this.jobContext.print("SUCCESS", "No parameters to configure");
        }

        // Write records
        let interupted: false | string = false;

        ON_DEATH({})((signal: string) => {
            if (signal === "SIGINT") {
                interupted = signal;
            }
        });

        const listrStatuses = await fetchMultiple(
            this.jobContext,
            packageFile,
            sourcesAndInspectionResults,
            {
                catalogSlug: packageFileWithContext.catalogSlug || "local",
                packageSlug: packageFileWithContext.packageFile.packageSlug,
                packageMajorVersion: new SemVer(packageFileWithContext.packageFile.version).major
            },
            sink,
            sinkConnectionConfiguration,
            sinkCredentialsConfiguration,
            sinkConfiguration,
            this.args.defaults || false,
            this.args.forceUpdate || false
        );

        const totalRecordCount = Object.values(listrStatuses).reduce((prev, curr) => {
            return prev + curr;
        }, 0);

        if (totalRecordCount > 0)
            this.jobContext.print("SUCCESS", `Finished writing ${numeral(totalRecordCount).format("0,0")} records`);

        if (interupted !== false) {
            this.jobContext.print("ERROR", `Recieved ${interupted}, stopping early.`);
        }

        const sinkCredentialsIdentifier = sinkConnector.requiresCredentialsConfiguration()
            ? await sinkConnector.getCredentialsIdentifierFromConfiguration(
                  sinkConnectionConfiguration,
                  sinkCredentialsConfiguration
              )
            : undefined;

        return {
            exitCode: 0,
            result: {
                packageFileWithContext,
                parameterCount: this.jobContext.getParameterCount(),
                sink,
                sinkConnectionConfiguration: obtainSinkConfigurationResult.connectionConfiguration,
                sinkConfiguration,
                sinkRepositoryIdentifier: sinkConnector.userSelectableConnectionHistory()
                    ? obtainSinkConfigurationResult.repositoryIdentifier
                    : undefined,
                sinkCredentialsIdentifier,
                sourceConnectionConfiguration: this.args.sourceConnectionConfig
                    ? JSON.parse(this.args.sourceConnectionConfig)
                    : undefined,
                sourceCredentialsIdentifier: this.args.sourceCredentialsIdentifier,
                sourceConfiguration: this.args.sourceConfig ? JSON.parse(this.args.sourceConfig) : undefined,
                sourceRepositoryIdentifier: this.args.sourceRepositoryIdentifier,
                excludedSchemaProperties,
                renamedSchemaProperties,

                packageSourceConnectionConfiguration: packageSourceConnectionConfig,
                packageSourceCredentialsIdentifiers: packageSourceCredentialIdentifiers,
                packageSourceConfiguration: packageSourceConfig
            }
        };
    }
}

/** Runs several tasks at once to fetch data from multiple sources
 */
export async function fetchMultiple(
    jobContext: JobContext,
    packageFile: PackageFile,
    sourcesAndInspectionResults: { source: Source; inspectionResult: InspectionResults }[],
    sinkStateKey: SinkStateKey,
    sink: Sink,
    sinkConnectionConfiguration: DPMConfiguration,
    sinkCredentialsConfiguration: DPMConfiguration,
    sinkConfiguration: DPMConfiguration,
    defaults: boolean,
    forceUpdate: boolean
): Promise<{ [key: string]: number }> {
    const fetchPreparations: {
        source: Source;
        uriInspectionResults: InspectionResults;
        streamSetPreview: StreamSetPreview;
        sinkStateKey: SinkStateKey;
        sinkState: SinkState | null;
    }[] = [];

    for (const sourceAndInspectionResults of sourcesAndInspectionResults) {
        const source = sourceAndInspectionResults.source;
        const uriInspectionResults = sourceAndInspectionResults.inspectionResult;

        for (const streamSetPreview of uriInspectionResults.streamSetPreviews) {
            jobContext.setCurrentStep("Checking State of " + streamSetPreview.slug);

            let sinkState = await sink.getSinkState(
                sinkConnectionConfiguration,
                sinkCredentialsConfiguration,
                sinkConfiguration,
                sinkStateKey,
                jobContext
            );

            if (forceUpdate) sinkState = null;

            if (!forceUpdate) {
                const task = await jobContext.startTask(
                    "Checking if new records are available for " + streamSetPreview.slug
                );

                if (!(await newRecordsAvailable(streamSetPreview, sinkState))) {
                    await task.end(
                        "SUCCESS",
                        "No new records available for " +
                            streamSetPreview.slug +
                            ". Use --force-update to skip this check."
                    );
                    continue;
                }

                await task.end("SUCCESS", "New records may be available");
            } else {
                jobContext.print("SUCCESS", "Force update enabled, not checking state");
            }

            const streamSet = source.streamSets.find((s) => s.slug === streamSetPreview.slug);

            if (streamSet === undefined) {
                jobContext.print(
                    "WARN",
                    "Source returned a stream set slug of " +
                        streamSetPreview.slug +
                        " but that is not present in the package file. The package file is out of date (or something is wrong with the source). This may affect writing data. Use the `datapm update ...` command to update the package file."
                );
            }

            fetchPreparations.push({
                sinkState,
                sinkStateKey,
                source,
                streamSetPreview,
                uriInspectionResults: uriInspectionResults
            });
        }
    }

    const latestStatuses: Record<string, number> = {};

    const fetchPromises: Promise<FetchResult>[] = [];

    for (const fetchPreparation of fetchPreparations) {
        jobContext.setCurrentStep("Reading " + fetchPreparation.streamSetPreview.slug);
        let task = await jobContext.startTask("Opening sink stream");

        let fetchStatus: FetchStatus = FetchStatus.OPENING_STREAM;

        let lastFetchStatus: FetchStatus | undefined;

        const fetchPromise = fetch(
            jobContext,
            {
                state: (state) => {
                    fetchStatus = state.resource.status;

                    if (lastFetchStatus !== fetchStatus) {
                        task.setMessage(state.resource.status.toString() + " " + state.resource.name);
                    }
                    lastFetchStatus = fetchStatus;
                },
                progress: async (state) => {
                    latestStatuses[fetchPreparation.source.slug + "/" + fetchPreparation.streamSetPreview.slug] =
                        state.recordsCommited;

                    if (fetchStatus !== FetchStatus.READING_STREAM) return;

                    let text = "";

                    const recordCountString =
                        state.recordsRecieved < 10000
                            ? numeral(state.recordsRecieved).format("0,0")
                            : numeral(state.recordsRecieved).format("0.00a");

                    const recordsPerSecondString = numeral(state.recordsPerSecond).format("0.0a");

                    text += `Stream ${fetchPreparation.streamSetPreview.slug}\n`;

                    if (state.percentComplete) {
                        const percentString = numeral(state.percentComplete).format("0.0%");

                        text += `   ${percentString} complete\n`;
                    }

                    if (state.bytesRecieved > 0) {
                        const bytesCountString = numeral(state.bytesRecieved).format("0.0b");

                        text += `   ${bytesCountString} received`;

                        if (state.bytesPerSecond) {
                            const bytesPersecondString = numeral(state.bytesPerSecond).format("0.0b");

                            text += ` - ${bytesPersecondString} per second`;
                        }

                        text += "\n";
                    }

                    text += `   ${recordCountString} records received - ${recordsPerSecondString} per second\n`;

                    if (state.secondsRemaining) {
                        const remainingTimeString = formatRemainingTime(state.secondsRemaining);

                        text += `   estimated ${remainingTimeString} seconds remaining`;
                    }

                    if (task.getStatus() !== "RUNNING") {
                        task = await jobContext.startTask(text);
                    }

                    task.setMessage(text);
                },
                finish: (line, recordCount, result) => {
                    fetchStatus = FetchStatus.COMPLETED;
                    latestStatuses[
                        fetchPreparation.source.slug + "/" + fetchPreparation.streamSetPreview.slug
                    ] = recordCount;

                    if (result === FetchOutcome.SUCCESS) task.end("SUCCESS", line);
                    else if (result === FetchOutcome.FAILURE) task.end("ERROR", line);
                    else if (result === FetchOutcome.WARNING) task.end("SUCCESS", line);
                    else throw new Error("Unknown FetchOutcome " + result);
                },
                prompt: async (parameters) => {
                    await jobContext.parameterPrompt(parameters);
                }
            },
            packageFile,
            fetchPreparation.source,
            fetchPreparation.streamSetPreview,
            sink,
            sinkConnectionConfiguration,
            sinkCredentialsConfiguration,
            sinkConfiguration,
            fetchPreparation.sinkStateKey,
            fetchPreparation.sinkState
        );

        fetchPromises.push(fetchPromise);
    }

    // TODO Use a concurrency pool here
    await Promise.all(fetchPromises);

    return latestStatuses;
}
