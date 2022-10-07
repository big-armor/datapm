import {
    CountPrecision,
    DPMConfiguration,
    DPMRecord,
    DPMRecordValue,
    Schema,
    Source,
    StreamStats,
    UpdateMethod
} from "datapm-lib";
import { Writable } from "stream";
import { clearInterval } from "timers";
import { Maybe } from "../util/Maybe";
import { InflatedByteCountTransform } from "../transforms/InflatedByteCountTransform";
import { StatsTransform } from "../transforms/StatsTransform";
import {
    SourceDescription,
    SourceStreamsInspectionResult,
    StreamAndTransforms,
    StreamSetPreview,
    StreamStatusContext,
    StreamSummary
} from "./Source";
import { ConnectorDescription } from "./Connector";
import { EXTENDED_CONNECTORS } from "./ConnectorUtil";
import { BatchingTransform } from "../transforms/BatchingTransform";
import { TimeOrDeathTransform } from "../transforms/TimeOrDeathTransform";
import { RecordStreamContextTransform } from "../transforms/RecordStreamContextTransform";

export async function getSourcesDescriptions(): Promise<SourceDescription[]> {
    const returnValue: SourceDescription[] = [];

    for (let i = 0; i < EXTENDED_CONNECTORS.length; i++) {
        const repository = EXTENDED_CONNECTORS[i];

        if (!repository.hasSource()) continue;

        const sourceDescription = await repository.getSourceDescription();

        if (!sourceDescription)
            throw new Error(repository.getType() + " hasSource is true, but has no sourceDescription.");

        returnValue.push(sourceDescription);
    }

    return returnValue;
}

export async function getSourceByType(type: string): Promise<Maybe<SourceDescription>> {
    return (
        (await EXTENDED_CONNECTORS.filter((f) => f.hasSource())
            .find((repository) => repository.getType() === type)
            ?.getSourceDescription()) || null
    );
}

export async function findRepositoryForSourceUri(uri: string): Promise<ConnectorDescription> {
    for (let i = 0; i < EXTENDED_CONNECTORS.length; i++) {
        const repository = EXTENDED_CONNECTORS[i];

        if (!repository.hasSource()) continue;

        const sourceDescription = await repository.getSourceDescription();

        if (!sourceDescription)
            throw new Error(repository.getType() + " hasSource is true, but has no sourceDescription.");

        if (sourceDescription.supportsURI(uri)) {
            return repository;
        }
    }

    return Promise.reject(new Error("NO_SOURCE_FOR_URI - " + uri));
}

export async function generateSchemasFromSourceStreams(
    source: Source,
    streamSetPreview: StreamSetPreview,
    streamStatusContext: StreamStatusContext,
    _configuration: DPMConfiguration,
    inspectionSeconds: number
): Promise<SourceStreamsInspectionResult> {
    const schemas: { [key: string]: Schema } = {};

    const startTime = Date.now();

    let completedStreamsRecordCount = 0;
    let currentStreamRecordCount = 0;

    let completedStreamsInspectedRecordCount = 0;
    let currentStreamInspectedCount = 0;

    let bytesReceived = 0;
    let completed = false;
    let error: Error;

    const updateMethods: UpdateMethod[] = [];

    const timeoutMs = inspectionSeconds * 1000;

    // Holds the next stream that will be opened
    let nextStreamIndex = 0;
    let currentStreamSummary: StreamSummary | null = null;

    const interval = setInterval(() => {
        if (completed || error) {
            clearInterval(interval);
            return;
        }
        const recordCount = completedStreamsRecordCount + currentStreamRecordCount;
        const recordsInspectedCount = completedStreamsInspectedRecordCount + currentStreamInspectedCount;
        const currentTime = Date.now();
        streamStatusContext.onProgress({
            currentStreamName: currentStreamSummary?.name || "",
            msRemaining: timeoutMs - (currentTime - startTime),
            bytesProcessed: bytesReceived,
            recordsInspectedCount: recordsInspectedCount,
            recordCount,
            recordsPerSecond: recordCount / ((currentTime - startTime) / 1000),
            final: false
        });
    }, 1000);

    const flushingFinalRecords = false;

    let returnPromiseReject: (error: Error) => void;
    let returnPromiseResolve: (value: SourceStreamsInspectionResult) => void;

    const returnPromise = new Promise<SourceStreamsInspectionResult>((resolve, reject) => {
        returnPromiseReject = reject;
        returnPromiseResolve = resolve;
    });

    const moveToNextStream = async function () {
        completedStreamsRecordCount += currentStreamRecordCount;
        completedStreamsInspectedRecordCount += currentStreamInspectedCount;

        if (streamSetPreview.streamSummaries) {
            const { streamSummaries } = streamSetPreview;
            if (streamSummaries.length === 0) {
                return Promise.reject(new Error("NO_STREAMS_FOUND"));
            }
            if (nextStreamIndex === streamSummaries.length) {
                finalize(true);
                return;
            }
            currentStreamSummary = streamSummaries[nextStreamIndex++];
            streamStatusContext.onStart(currentStreamSummary.name);
        } else {
            const streamSummary = await streamSetPreview.moveToNextStream?.();
            if (!streamSummary) {
                finalize(true);
                return;
            }
            currentStreamSummary = streamSummary;
            streamStatusContext.onStart(currentStreamSummary.name);
        }

        const sourceStreamContext: StreamAndTransforms = await currentStreamSummary.openStream(null);

        if (updateMethods.find((v) => v === currentStreamSummary?.updateMethod) == null) {
            updateMethods.push(currentStreamSummary.updateMethod);
        }

        const byteCountTransform = new InflatedByteCountTransform(
            (bytes) => {
                if (bytes != null) bytesReceived += bytes;
            },
            {
                objectMode: true
            }
        );

        const statsTransform = new StatsTransform(
            (transformRecordCount, transformRecordsInspectedCount) => {
                currentStreamRecordCount = transformRecordCount;
                currentStreamInspectedCount = transformRecordsInspectedCount;

                return "INSPECT";
            },
            schemas,
            {
                objectMode: true
            }
        );
        let lastTransform = sourceStreamContext.stream;

        sourceStreamContext.stream.on("error", (error: Error) => {
            console.error("source stream error");
            returnPromiseReject(error);
        });

        byteCountTransform.on("error", (error: Error) => {
            console.error("byteCountTransform Error");
            returnPromiseReject(error);
        });

        lastTransform = lastTransform.pipe(byteCountTransform);

        sourceStreamContext.transforms?.forEach((transform) => {
            transform.on("error", (error) => {
                if (!flushingFinalRecords) {
                    console.error("source supplied transform Error");

                    returnPromiseReject(error);
                }
            });

            lastTransform = lastTransform.pipe(transform);
        });

        lastTransform = lastTransform.pipe(new BatchingTransform(1000, 100));

        lastTransform = lastTransform.pipe(
            new RecordStreamContextTransform(source, streamSetPreview, currentStreamSummary)
        );

        lastTransform = lastTransform.pipe(statsTransform);

        lastTransform = lastTransform.pipe(
            new TimeOrDeathTransform(timeoutMs, () => {
                sourceStreamContext.stream.destroy();
                finalize(false);
            })
        );

        lastTransform.on("error", (error) => {
            if (!flushingFinalRecords) {
                returnPromiseReject(error);
            }
        });

        lastTransform.on("end", async () => {
            await moveToNextStream();
        });

        const dummyWritable = new Writable({
            objectMode: true,
            write: (chunk, encoding, callback) => {
                callback();
            }
        });

        lastTransform.pipe(dummyWritable);

        return null;
    };

    const finalize = (reachedEnd: boolean) => {
        completed = true;
        const currentTime = Date.now();

        const inspectedCount = completedStreamsInspectedRecordCount + (reachedEnd ? 0 : currentStreamInspectedCount);
        const recordCount = completedStreamsRecordCount + (reachedEnd ? 0 : currentStreamRecordCount);

        streamStatusContext.onComplete({
            currentStreamName: currentStreamSummary?.name || "",
            msRemaining: 0,
            bytesProcessed: bytesReceived,
            recordsInspectedCount: inspectedCount,
            recordCount,
            recordsPerSecond: recordCount / ((currentTime - startTime) / 1000),
            final: true
        });

        for (const schema of Object.values(schemas)) {
            finalizeSchema(reachedEnd, schema);
        }

        const expectedTotalRawBytes = streamSetPreview.streamSummaries?.reduce((prev: number | undefined, cur) => {
            if (prev === undefined || cur.expectedTotalRawBytes === undefined) {
                return undefined;
            }

            return prev + cur.expectedTotalRawBytes;
        }, 0);

        let byteCount: number = bytesReceived;
        let byteCountPrecision = CountPrecision.EXACT;

        let recordCountPrecision = CountPrecision.EXACT;

        if (!reachedEnd) {
            if (expectedTotalRawBytes != null && expectedTotalRawBytes !== 0) {
                byteCountPrecision = CountPrecision.EXACT;
                byteCount = expectedTotalRawBytes;
            } else {
                byteCountPrecision = CountPrecision.GREATER_THAN;
                byteCount = bytesReceived;
            }

            recordCountPrecision = CountPrecision.GREATER_THAN;
        }

        const streamStats: StreamStats = {
            inspectedCount,
            byteCount: byteCount > 0 ? byteCount : undefined,
            byteCountPrecision: byteCount > 0 ? byteCountPrecision : undefined,
            recordCount,
            recordCountPrecision
        };

        returnPromiseResolve({
            schemas: Object.values(schemas),
            streamStats,
            updateMethods,
            endReached: reachedEnd
        });
    };

    await moveToNextStream();

    return returnPromise;
}

function finalizeSchema(reachedEnd: boolean, schema: Schema): void {
    let recordCountPrecision = CountPrecision.EXACT;

    if (!reachedEnd) {
        recordCountPrecision = CountPrecision.GREATER_THAN;
    }

    schema.recordCountPrecision = recordCountPrecision;
}

export function memorySizeOf(obj: DPMRecordValue): number {
    let bytes = 0;

    function sizeOf(obj: DPMRecordValue) {
        if (obj !== null && obj !== undefined) {
            switch (typeof obj) {
                case "string":
                    bytes += obj.length * 2;
                    break;
                case "boolean":
                    bytes += 4;
                    break;
                case "number":
                    bytes += 8;
                    break;
                case "bigint":
                    bytes += 32;
                    break;
                case "object":
                    // eslint-disable-next-line no-case-declarations
                    const objClass = Object.prototype.toString.call(obj).slice(8, -1);
                    // eslint-disable-next-line no-case-declarations
                    const targetObject = obj as DPMRecord;

                    if (Buffer.isBuffer(obj)) {
                        bytes = (obj as Buffer).length;
                    } else if (objClass === "Object" || objClass === "Array") {
                        for (const key in targetObject) {
                            // eslint-disable-next-line no-prototype-builtins
                            if (!targetObject.hasOwnProperty(key)) continue;
                            sizeOf(targetObject[key]);
                        }
                    } else {
                        bytes += targetObject.toString().length;
                    }
                    break;
            }
        }
        return bytes;
    }

    return sizeOf(obj);
}
