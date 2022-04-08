import chalk from "chalk";
import {
    CountPrecision,
    DPMConfiguration,
    leastPrecise,
    PackageFile,
    SinkState,
    SinkStateKey,
    Source,
    ParameterType
} from "datapm-lib";
import ON_DEATH from "death";
import { SemVer } from "semver";
import { getConnectorDescriptionByType } from "../connector/ConnectorUtil";
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
import { Job, JobContext, JobResult } from "./Task";
import numeral from "numeral";

export interface FetchPackageJobResult {
    parameterCount: number;
    sink: Sink;
    sinkConfiguration: DPMConfiguration;
    packageFileWithContext: PackageFileWithContext;
    credentialsIdentifier: string | undefined;
    repositoryIdentifier: string | undefined;
}

export class FetchArguments {
    reference?: string;
    sink?: string;
    defaults?: boolean;
    sinkConfig?: string;
    repositoryIdentifier?: string;
    credentialsIdentifier?: string;
    sinkConnectionConfig?: string;
    sinkCredentialsConfig?: string;
    quiet?: boolean;
    forceUpdate?: boolean;
}

export class FetchPackageJob extends Job<FetchPackageJobResult> {
    constructor(private jobContext: JobContext, private args: FetchArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<FetchPackageJobResult>> {
        if (this.args.repositoryIdentifier != null && this.args.sinkConnectionConfig != null) {
            throw new Error("Cannot specify both repositoryIdentifier and sinkConnectionConfig");
        }

        if (this.args.credentialsIdentifier != null && this.args.sinkCredentialsConfig != null) {
            throw new Error("Cannot specify both credentialsIdentifier and sinkCredentialsConfig");
        }

        this.jobContext.setCurrentStep("Inspecting Package");

        if (this.args.reference == null) {
            const referencePromptResult = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    configuration: {},
                    name: "reference",
                    message: "What is the package name, url, or file name?",
                    validate: (value) => {
                        if (!value) return "Package file name or url required";
                        return true;
                    }
                }
            ]);

            this.args.reference = referencePromptResult.reference;
        }

        if (this.args.reference == null) throw new Error("The package file path or URL is required");

        // Finding package
        let task = await this.jobContext.startTask("Finding package " + this.args.reference);

        let packageFileWithContext: PackageFileWithContext;

        try {
            packageFileWithContext = await this.jobContext.getPackageFile(this.args.reference, "modified");
        } catch (error) {
            if (typeof error.message === "string" && error.message.includes("ERROR_SCHEMA_VERSION_TOO_NEW")) {
                await task.end("ERROR", "The package file was created by a newer version of the datapm client.");

                this.jobContext.print("INFO", "Update the datapm client to the latest version to use this package.");
                this.jobContext.print("NONE", "https://datapm.io/downloads");
            }
            if (typeof error.message === "string" && error.message.includes("NOT_AUTHENTICATED")) {
                await task.end("ERROR", "You are not logged in to the registry.");

                this.jobContext.print("INFO", "Use the following command to authenticate.");
                this.jobContext.print("NONE", chalk.green("datapm registry login"));
            } else {
                await task.end("ERROR", error.message);
            }

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

        await task.end("SUCCESS", `Found ${packageFile.displayName}`);

        let recordCountText = numeral(schemaDescriptionRecordCount).format("0a") + "";
        if (recordCountPrecision === CountPrecision.APPROXIMATE) {
            recordCountText = `approximpately ${recordCountText} `;
        } else if (recordCountPrecision === CountPrecision.GREATER_THAN) {
            recordCountText = `more than ${recordCountText} `;
        }
        recordCountText = `${schemaCount} schemas with ${recordCountText} records`;
        this.jobContext.print("INFO", recordCountText);

        const sourcesAndInspectionResults: {
            source: Source;
            inspectionResult: InspectionResults;
        }[] = [];

        for (const source of packageFile.sources) {
            this.jobContext.setCurrentStep("Inspecting " + source.slug);
            const inspectionResult = await inspectSourceConnection(this.jobContext, source, this.args.defaults);

            sourcesAndInspectionResults.push({
                source,
                inspectionResult
            });
        }

        this.jobContext.setCurrentStep("Sink Connector");

        // Getting sink
        let sinkType: string;

        if (this.args.sink) {
            sinkType = this.args.sink;
        } else if (this.args.defaults) {
            sinkType = "file";
        } else {
            const sinkDescriptions = await getSinkDescriptions();

            const sinkPromptResult = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoComplete,
                    configuration: {},
                    name: "type",
                    message: "Connector?",
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
        task = await this.jobContext.startTask(`Finding the sink named ${sinkType}`);

        const sinkConnectorDescription = getConnectorDescriptionByType(sinkType);

        if (sinkConnectorDescription == null) throw new Error("Could not find repository description for " + sinkType);

        const sinkConnector = await sinkConnectorDescription?.getConnector();

        if (sinkConnector == null) throw new Error("Could not find repository for " + sinkType);

        await task.end("SUCCESS", `Found the connector named ${sinkType}`);

        let parameterCount = 0;

        const obtainConnectionConfigurationResult = await obtainConnectionConfiguration(
            this.jobContext,
            sinkConnector,
            sinkConnectionConfiguration,
            this.args.repositoryIdentifier,
            this.args.defaults
        );

        if (obtainConnectionConfigurationResult === false) {
            this.jobContext.print("ERROR", "User canceled");
            return {
                exitCode: 1
            };
        }

        sinkConnectionConfiguration = obtainConnectionConfigurationResult.connectionConfiguration;

        parameterCount += obtainConnectionConfigurationResult.parameterCount;

        const obtainCredentialsConfigurationResult = await obtainCredentialsConfiguration(
            this.jobContext,
            sinkConnector,
            sinkConnectionConfiguration,
            sinkCredentialsConfiguration,
            false,
            this.args.credentialsIdentifier,
            this.args.defaults
        );

        if (obtainCredentialsConfigurationResult === false) {
            this.jobContext.print("ERROR", "User canceled");
            return {
                exitCode: 1
            };
        }

        sinkCredentialsConfiguration = obtainCredentialsConfigurationResult.credentialsConfiguration;

        parameterCount += obtainCredentialsConfigurationResult.parameterCount;

        const sinkDescription = await sinkConnectorDescription.getSinkDescription();

        if (sinkDescription == null) {
            this.jobContext.print("ERROR", `Could not find sink type: ${sinkType}`);
            return {
                exitCode: 1
            };
        }

        if (this.args.sink || this.args.defaults) {
            this.jobContext.print("SUCCESS", `Found the ${sinkDescription.getDisplayName()} sink`);
        }

        if (this.args.sinkConfig) {
            try {
                sinkConfiguration = JSON.parse(this.args.sinkConfig);
            } catch (error) {
                this.jobContext.print("ERROR", "ERROR_PARSING_SINK_CONFIG");
                return {
                    exitCode: 1
                };
            }
        }

        const sink = await sinkDescription.loadSinkFromModule();

        this.jobContext.setCurrentStep(sinkConnectorDescription.getDisplayName() + " Configuration");
        parameterCount += await repeatedlyPromptParameters(
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

        return {
            exitCode: 0,
            result: {
                packageFileWithContext,
                parameterCount,
                sink,
                sinkConfiguration,
                repositoryIdentifier: obtainConnectionConfigurationResult.repositoryIdentifier,
                credentialsIdentifier: obtainCredentialsConfigurationResult.credentialsIdentifier
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

        const fetchPromise = fetch(
            jobContext,
            {
                state: (state) => {
                    fetchStatus = state.resource.status;
                    task.setMessage(state.resource.status.toString() + " " + state.resource.name);
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
