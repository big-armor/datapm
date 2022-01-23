import {
    SinkState,
    SinkStateKey,
    DPMConfiguration,
    PackageFile,
    Schema,
    UpdateMethod,
    RecordStreamContext,
    Source
} from "datapm-lib";
import ON_DEATH from "death";
import { Readable, Transform, Writable } from "stream";
import { Maybe } from "../util/Maybe";
import { Sink, SinkSupportedStreamOptions, WritableWithContext } from "../repository/Sink";
import { StreamSetPreview } from "../repository/Source";
import { Parameter, ParameterType } from "./parameters/Parameter";
import {
    checkSchemaDataTypeConflicts,
    DeconflictOptions,
    getDeconflictChoices,
    streamRecords,
    updateSchemaWithDeconflictOptions
} from "./SchemaUtil";
import { SinkStateWritable } from "./transforms/SinkStateWritable";

export interface FetchResult {
    recordsTotal: number;
}

export async function newRecordsAvailable(
    streamSetPreview: StreamSetPreview,
    sinkStateMaybe: Maybe<SinkState>
): Promise<boolean> {
    if (sinkStateMaybe == null) return true;

    const sinkState = sinkStateMaybe;

    let newRecordsAvailable = false;

    let streamSetState = sinkState.streamSets[streamSetPreview.slug];

    if (streamSetState == null) {
        sinkState.streamSets[streamSetPreview.slug] = {
            streamStates: {}
        };

        streamSetState = sinkState.streamSets[streamSetPreview.slug];
    }

    if (!streamSetPreview.streamSummaries) {
        newRecordsAvailable = !streamSetPreview.updateHash || !streamSetState.updateHash;
    } else {
        for (const streamSummary of streamSetPreview.streamSummaries || []) {
            const streamState = streamSetState.streamStates[streamSummary.name];

            if (streamState == null) {
                newRecordsAvailable = true;
                break;
            }

            if (streamState.updateHash == null || streamSummary.updateHash == null) {
                newRecordsAvailable = true;
                break;
            }

            if (streamState.updateHash !== streamSummary.updateHash) {
                newRecordsAvailable = true;
                break;
            }
        }
    }

    return newRecordsAvailable;
}

export enum FetchStatus {
    PLANNING_OPERATIONS,
    OPENING_STREAM,
    READING_STREAM,
    READING_STREAM_WARNING,
    CLOSING,
    FLUSHING_FINAL_RECORDS,
    COMPLETED
}

export enum FetchOutcome {
    SUCCESS = "SUCCESS",
    WARNING = "WARNING",
    FAILURE = "FAILURE"
}

/** How the system should handle processing of streams */
export enum StreamSetProcessingMethod {
    /* Process a stream set in serial fashion */
    PER_STREAM_SET,

    /** Process each stream of a streamSet separatelly. This allows, but does not garauntee, the system to process in parallel */
    PER_STREAM
}

export interface FetchStreamStatus {
    bytesRecieved: number;
    bytesExpected?: number;
    recordsRecieved: number;
    recordsExpected?: number;
    recordsCommited: number;
    recordsPerSecond: number;
    bytesPerSecond?: number;
    secondsRemaining?: number;
    percentComplete?: number;
}

export async function fetch(
    context: {
        state: (state: {
            resource: {
                status: FetchStatus;
                name: string;
            };
        }) => void;
        progress: (progress: FetchStreamStatus) => void;
        finish: (line: string, finalRecordCount: number, type: FetchOutcome) => void;
        prompt: (parameters: Parameter[]) => Promise<void>;
    },
    packageFile: PackageFile,
    source: Source,
    streamSetPreview: StreamSetPreview,
    sink: Sink,
    sinkConnectionConfiguration: DPMConfiguration,
    sinkCredentialsConfiguration: DPMConfiguration,
    sinkConfiguration: DPMConfiguration,
    sinkStateKey: SinkStateKey,
    sinkState: Maybe<SinkState>
): Promise<FetchResult> {
    let bytesExpected = 0;
    let recordsExpected = 0;

    if (streamSetPreview.streamSummaries) {
        bytesExpected =
            streamSetPreview.streamSummaries
                ?.map((s) => s.expectedTotalRawBytes)
                .reduce((prev, curr) => {
                    if (prev == null || curr == null) return undefined;
                    return prev + curr;
                }, 0) || 0;
        recordsExpected =
            streamSetPreview.streamSummaries
                ?.map((s) => s.expectedRecordCount)
                .reduce((prev, curr) => {
                    if (prev == null || curr == null) return undefined;
                    return prev + curr;
                }, 0) || 0;
    } else {
        bytesExpected = streamSetPreview.expectedBytesTotal || 0;
        recordsExpected = streamSetPreview.expectedRecordsTotal || 0;
    }

    context.state({
        resource: {
            name: streamSetPreview.slug,
            status: FetchStatus.PLANNING_OPERATIONS
        }
    });

    let deconflictOptions: Record<string, DeconflictOptions> | null = null;

    let returnPromiseReject: (error: Error) => void;
    let returnPromiseResolve: (value: FetchResult | PromiseLike<FetchResult>) => void;

    if (await sink.isStronglyTyped(sinkConfiguration)) {
        for (const schema of packageFile.schemas) {
            const conflictedPropertyTypes = await checkSchemaDataTypeConflicts(schema);
            const conflictedTitles = Object.keys(conflictedPropertyTypes);
            if (conflictedTitles.length > 0) {
                deconflictOptions = {};
                for (const title of conflictedTitles) {
                    const valueTypes = conflictedPropertyTypes[title];

                    const deconflictOptionResponse: DPMConfiguration = {};

                    await context.prompt([
                        {
                            configuration: deconflictOptionResponse,
                            type: ParameterType.Select,
                            name: "deconflictOption",
                            message: `${title} has ${valueTypes.join(
                                " and "
                            )} values. How should this output be handled?`,
                            options: getDeconflictChoices(valueTypes)
                        }
                    ]);
                    deconflictOptions[title] =
                        DeconflictOptions[deconflictOptionResponse.deconflictOption as keyof typeof DeconflictOptions];
                }
                updateSchemaWithDeconflictOptions(schema, deconflictOptions);
            }
        }
    }

    const sourceSupportedUpdateMethod = streamSetPreview.supportedUpdateMethods;

    const sinkStreamOptions: SinkSupportedStreamOptions = sink.getSupportedStreamOptions(sinkConfiguration, sinkState);

    if (!sourceSupportedUpdateMethod.find((s) => sinkStreamOptions.updateMethods.find((ss) => s === ss))) {
        throw new Error(
            "Source only supports update methods: " +
                sourceSupportedUpdateMethod.join(",") +
                " and sink only supports update methods " +
                sinkStreamOptions.updateMethods.join(",") +
                " Therefore there is no way to stream from this source to this sink"
        ); // TODO This could be more leanient, but warn of lost or duplicated datat
    }

    let updateMethod =
        sinkStreamOptions.updateMethods.includes(UpdateMethod.APPEND_ONLY_LOG) &&
        sourceSupportedUpdateMethod.includes(UpdateMethod.APPEND_ONLY_LOG)
            ? UpdateMethod.APPEND_ONLY_LOG
            : UpdateMethod.BATCH_FULL_SET;

    if (sinkState == null) updateMethod = UpdateMethod.BATCH_FULL_SET;

    const expectedStreamStats = Object.fromEntries(
        streamSetPreview.streamSummaries?.map((s) => [
            s.name,
            {
                expectedRecordCount: s.expectedRecordCount,
                expectedByteCount: s.expectedTotalRawBytes,
                bytesReceived: 0
            }
        ]) || []
    );

    context.state({
        resource: {
            name: streamSetPreview.slug,
            status: FetchStatus.OPENING_STREAM
        }
    });

    const sourceStream: Readable = await streamRecords(
        source,
        streamSetPreview,
        {
            startingStream: (
                streamSlug: string,
                expectedRecordCount: number | undefined,
                expectedByteCount: number | undefined
            ) => {
                context.state({
                    resource: {
                        name: streamSlug,
                        status: FetchStatus.OPENING_STREAM
                    }
                });

                let streamExpectedStatus = expectedStreamStats[streamSlug];

                if (streamExpectedStatus == null) {
                    expectedStreamStats[streamSlug] = {
                        expectedByteCount: 0,
                        expectedRecordCount: 0,
                        bytesReceived: 0
                    };

                    streamExpectedStatus = expectedStreamStats[streamSlug];
                }

                if (expectedRecordCount !== undefined) {
                    streamExpectedStatus.expectedRecordCount = expectedRecordCount;
                }

                if (expectedByteCount !== undefined) {
                    streamExpectedStatus.expectedByteCount = expectedByteCount;
                }
            },
            bytesReceived: (streamSlug: string, bytesTotal: number) => {
                const streamExpectedStatus = expectedStreamStats[streamSlug];

                streamExpectedStatus.bytesReceived = bytesTotal;
            }
        },
        packageFile.schemas,
        sinkState,
        deconflictOptions
    );

    context.state({
        resource: {
            name: streamSetPreview.slug,
            status: FetchStatus.READING_STREAM
        }
    });

    let recordCount = 0;

    const recordCounterTransform = new Transform({
        objectMode: true,
        transform: function (chunk: RecordStreamContext[], encoding, callback) {
            recordCount += chunk.length;
            this.push(chunk);
            callback(null);
        }
    });

    const startTime = new Date().getTime();

    const statusUpdateInterval = setInterval(() => {
        let percent = 0;
        let remainingSeconds = 0;

        const expectedByteCount = Object.values(expectedStreamStats)
            .map((e) => e.expectedByteCount)
            .reduce((prev, curr) => {
                if (prev == null || curr == null) return undefined;

                return prev + curr;
            }, 0);

        const bytesRecieved = Object.values(expectedStreamStats)
            .map((e) => e.bytesReceived)
            .reduce((prev, curr) => {
                return prev + curr;
            }, 0);

        const expectedRecordCount = Object.values(expectedStreamStats)
            .map((e) => e.expectedRecordCount)
            .reduce((prev, curr) => {
                if (prev == null || curr == null) return undefined;

                return prev + curr;
            }, 0);

        const currentTime = new Date().getTime();

        const bytesPerSecond = (bytesRecieved / (currentTime - startTime)) * 1000;
        const recordsPerSecond = (recordCount / (currentTime - startTime)) * 1000;

        if (expectedByteCount !== undefined) {
            percent = bytesRecieved / expectedByteCount;
            remainingSeconds = Math.ceil((expectedByteCount - bytesRecieved) / bytesPerSecond);
        } else if (expectedRecordCount !== undefined) {
            percent = recordCount / expectedRecordCount;
            remainingSeconds = Math.ceil((expectedRecordCount - recordCount) / recordsPerSecond);
        }

        context.progress({
            bytesRecieved,
            bytesExpected,
            recordsExpected,
            recordsRecieved: recordCount,
            recordsCommited: 0,
            recordsPerSecond: recordsPerSecond,
            bytesPerSecond: bytesPerSecond,
            secondsRemaining: remainingSeconds,
            percentComplete: percent
        });
    }, 500);

    sourceStream.once("close", () => {
        clearInterval(statusUpdateInterval);
    });

    sourceStream.once("end", () => {
        context.state({
            resource: {
                name: streamSetPreview.slug,
                status: FetchStatus.FLUSHING_FINAL_RECORDS
            }
        });
    });

    const finalSinkState: SinkState = {
        ...(sinkState || {
            packageVersion: packageFile.version,
            streamSets: {},
            timestamp: new Date()
        })
    };

    const schemaWriteables: Record<string, Writable> = {};
    const writablesWithContexts: WritableWithContext[] = [];

    return new Promise<FetchResult>((resolve, reject) => {
        returnPromiseReject = reject;
        returnPromiseResolve = resolve;

        let stoppedEarly = false;

        sourceStream.on("error", (error) => {
            reject(new Error("Source error: " + error.message));

            // TODO tell sink to clean up?
        });

        const schemaSwitchingWritable: Writable = new Writable({
            objectMode: true,
            write: async (chunks: RecordStreamContext[], encoding, callback) => {
                const writableBatches: Record<string, RecordStreamContext[]> = {};

                for (const chunk of chunks) {
                    if (writableBatches[chunk.recordContext.schemaSlug] == null) {
                        writableBatches[chunk.recordContext.schemaSlug] = [];
                    }

                    writableBatches[chunk.recordContext.schemaSlug].push(chunk);
                }

                const writingPromises: Promise<void>[] = [];

                for (const schemaSlug in writableBatches) {
                    const schema = packageFile.schemas.find((s) => s.title === schemaSlug);

                    if (schema == null) {
                        throw new Error("SCHEMA_NOT_FOUND: " + schemaSlug);
                    }

                    let schemaWritable = schemaWriteables[schemaSlug];

                    if (schemaWritable == null) {
                        await createSchemaWritable(
                            schemaWriteables,
                            writablesWithContexts,
                            sink,
                            finalSinkState,
                            schema,
                            sinkConnectionConfiguration,
                            sinkCredentialsConfiguration,
                            sinkConfiguration,
                            updateMethod
                        );

                        schemaWritable = schemaWriteables[schemaSlug];

                        schemaWritable.on("error", (error) => {
                            returnPromiseReject(new Error("Sink error: " + error.message));
                        });

                        schemaWritable.on("finish", () => {
                            // returnPromiseResolve();
                        });
                    }

                    writingPromises.push(
                        new Promise<void>((resolve) => {
                            const ok = schemaWritable.write(writableBatches[schemaSlug]);
                            if (!ok) {
                                schemaWritable.once("drain", resolve);
                            } else {
                                resolve();
                            }
                        })
                    );
                }

                try {
                    await Promise.all(writingPromises);
                    callback(null);
                } catch (error) {
                    callback(error);
                }
            },
            final: async (callback) => {
                // Close all open writables
                await Promise.all(
                    Object.values(writablesWithContexts).map(
                        (w) =>
                            new Promise<void>((resolve) => {
                                const targetWritable =
                                    w.transforms !== undefined && w.transforms?.length > 0
                                        ? // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                          w.transforms![0]
                                        : w.writable;

                                w.writable.once("finish", () => {
                                    resolve();
                                });
                                targetWritable.end();
                            })
                    )
                );
                // Get the commitKeys after the writable has been closed
                const commitKeys = writablesWithContexts.flatMap((w) => w.getCommitKeys());

                // Commit all writables at once
                if (commitKeys.length > 0) {
                    await sink.commitAfterWrites(commitKeys, sinkConnectionConfiguration, sinkCredentialsConfiguration);
                }

                callback();
            }
        });

        schemaSwitchingWritable.on("finish", async () => {
            finalSinkState.packageVersion = packageFile.version;
            streamSetPreview.streamSummaries?.forEach((s) => {
                let streamSet = finalSinkState.streamSets[streamSetPreview.slug];

                if (streamSet == null) {
                    finalSinkState.streamSets[streamSetPreview.slug] = {
                        streamStates: {}
                    };

                    streamSet = finalSinkState.streamSets[streamSetPreview.slug];
                }

                let streamState = streamSet.streamStates[s.name];

                if (streamState == null) {
                    streamSet.streamStates[s.name] = {
                        schemaStates: {}
                    };
                    streamState = streamSet.streamStates[s.name];
                }

                streamState.updateHash = stoppedEarly ? undefined : s.updateHash;
            });
            try {
                await sink.saveSinkState(
                    sinkConnectionConfiguration,
                    sinkCredentialsConfiguration,
                    sinkConfiguration,
                    sinkStateKey,
                    finalSinkState
                );
            } catch (error) {
                context.finish(
                    `Error saving stream state after successfully writing records. This puts the sink state in an inconsisent state with the reocrds written. You will need to delete the file/tables/records from the target sink and restart the full transfer`,
                    recordCount,
                    FetchOutcome.FAILURE
                );
                context.finish(error.message, recordCount, FetchOutcome.FAILURE);

                if (error.stack != null) context.finish(error.stack, recordCount, FetchOutcome.FAILURE);
                returnPromiseReject(error);
                return;
            }

            context.finish("Success", recordCount, FetchOutcome.SUCCESS);

            returnPromiseResolve({
                recordsTotal: recordCount
            });
        });

        const OFF_DEATH = ON_DEATH({})(() => {
            stoppedEarly = true;
            sourceStream.unpipe();
            recordCounterTransform.end();
        });

        sourceStream.once("close", () => {
            OFF_DEATH();
        });

        sourceStream.pipe(recordCounterTransform);
        recordCounterTransform.pipe(schemaSwitchingWritable);
    });
}

async function createSchemaWritable(
    schemaWriteables: Record<string, Writable>,
    writablesWithContexts: WritableWithContext[],
    sink: Sink,
    sinkState: SinkState,
    schema: Schema,
    sinkConnectionConfiguration: DPMConfiguration,
    sinkCredentialsConfiguration: DPMConfiguration,
    sinkConfiguration: DPMConfiguration,
    updateMethod: UpdateMethod
): Promise<WritableWithContext> {
    const writeableWithContext = await sink.getWriteable(
        schema,
        sinkConnectionConfiguration,
        sinkCredentialsConfiguration,
        sinkConfiguration,
        updateMethod
    );
    writablesWithContexts.push(writeableWithContext);

    if (writeableWithContext.transforms && writeableWithContext.transforms.length > 0) {
        let lastTransform: Transform | null = null;
        for (const transform of writeableWithContext.transforms) {
            if (lastTransform == null) {
                lastTransform = transform;
            } else {
                lastTransform = lastTransform.pipe(transform);
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        lastTransform = lastTransform!.pipe(writeableWithContext.writable);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        schemaWriteables[schema.title!] = writeableWithContext.transforms[0];
    } else {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        schemaWriteables[schema.title!] = writeableWithContext.writable;
    }

    writeableWithContext.writable.pipe(new SinkStateWritable(sinkState));

    return writeableWithContext;
}
