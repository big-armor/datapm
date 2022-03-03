import {
    CountPrecision,
    DPMConfiguration,
    DPMRecord,
    DPMRecordValue,
    Properties,
    Schema,
    StreamStats,
    ValueTypes
} from "datapm-lib";
import { Writable } from "stream";
import { clearInterval } from "timers";
import { Maybe } from "../util/Maybe";
import { InflatedByteCountTransform } from "../transforms/InflatedByteCountTransform";
import { StatsTransform } from "../transforms/StatsTransform";
import { ContentLabelDetector } from "../content-detector/ContentLabelDetector";
import {
    ExtendedJSONSchema7TypeName,
    SourceDescription,
    SourceInspectionContext,
    SourceStreamsInspectionResult,
    StreamAndTransforms,
    StreamSetPreview,
    StreamStatusContext
} from "./Source";
import { ConnectorDescription } from "./Connector";
import { JSONSchema7TypeName } from "json-schema";
import { EXTENDED_REPOSITORIES } from "./ConnectorUtil";
import { BatchingTransform } from "../transforms/BatchingTransform";

export async function getSourcesDescriptions(): Promise<SourceDescription[]> {
    const returnValue: SourceDescription[] = [];

    for (let i = 0; i < EXTENDED_REPOSITORIES.length; i++) {
        const repository = EXTENDED_REPOSITORIES[i];

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
        (await EXTENDED_REPOSITORIES.filter((f) => f.hasSource())
            .find((repository) => repository.getType() === type)
            ?.getSourceDescription()) || null
    );
}

export async function findRepositoryForSourceUri(uri: string): Promise<ConnectorDescription> {
    for (let i = 0; i < EXTENDED_REPOSITORIES.length; i++) {
        const repository = EXTENDED_REPOSITORIES[i];

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
    streamSetPreview: StreamSetPreview,
    streamStatusContext: StreamStatusContext,
    _sourceInspectionContext: SourceInspectionContext,
    _configuration: DPMConfiguration
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

    const interval = setInterval(() => {
        if (completed || error) {
            clearInterval(interval);
            return;
        }
        const recordCount = completedStreamsRecordCount + currentStreamRecordCount;
        const recordsInspectedCount = completedStreamsInspectedRecordCount + currentStreamInspectedCount;
        const currentTime = Date.now();
        streamStatusContext.onProgress({
            bytesProcessed: bytesReceived,
            recordsInspectedCount: recordsInspectedCount,
            recordCount,
            recordsPerSecond: recordCount / ((currentTime - startTime) / 1000)
        });
    }, 1000);

    const MAX_INSPECT_RECORDS = 50000;
    const MAX_COUNT_RECORDS = 250000;

    let flushingFinalRecords = false;

    let returnPromiseReject: (error: Error) => void;
    let returnPromiseResolve: (value: SourceStreamsInspectionResult) => void;

    const returnPromise = new Promise<SourceStreamsInspectionResult>((resolve, reject) => {
        returnPromiseReject = reject;
        returnPromiseResolve = resolve;
    });

    let streamIndex = 0;

    const contentLabelDetector = new ContentLabelDetector();

    const moveToNextStream = async function () {
        completedStreamsRecordCount += currentStreamRecordCount;
        completedStreamsInspectedRecordCount += currentStreamInspectedCount;

        let sourceStreamContext: StreamAndTransforms;
        if (streamSetPreview.streamSummaries) {
            const { streamSummaries } = streamSetPreview;
            if (streamSummaries.length === 0) {
                return Promise.reject(new Error("STREAM_NOT_AVAILABLE"));
            }
            if (streamIndex === streamSummaries.length) {
                finalize(true);
                return;
            }
            const streamSummary = streamSummaries[streamIndex++];
            sourceStreamContext = await streamSummary.openStream(null);
        } else {
            const streamSummary = await streamSetPreview.moveToNextStream?.();
            if (!streamSummary) {
                finalize(true);
                return;
            }
            sourceStreamContext = await streamSummary.openStream(null);
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

                if (completedStreamsRecordCount + currentStreamRecordCount >= MAX_COUNT_RECORDS) {
                    if (!flushingFinalRecords) {
                        flushingFinalRecords = true;
                    }

                    return "END";
                } else if (completedStreamsRecordCount + currentStreamRecordCount >= MAX_INSPECT_RECORDS) {
                    return "COUNT";
                }

                return "INSPECT";
            },
            schemas,
            contentLabelDetector,
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

        lastTransform = lastTransform.pipe(new BatchingTransform(1000));

        lastTransform = lastTransform.pipe(statsTransform);

        statsTransform.on("error", (error) => {
            if (!flushingFinalRecords) {
                console.error("statsTransform Error");

                returnPromiseReject(error);
            }
        });

        statsTransform.on("end", async () => {
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

        streamStatusContext.onComplete({
            bytesProcessed: bytesReceived,
            recordsInspectedCount: completedStreamsInspectedRecordCount,
            recordCount: completedStreamsRecordCount,
            recordsPerSecond: completedStreamsRecordCount / ((currentTime - startTime) / 1000)
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
            inspectedCount: completedStreamsInspectedRecordCount,
            byteCount: byteCount > 0 ? byteCount : undefined,
            byteCountPrecision: byteCount > 0 ? byteCountPrecision : undefined,
            recordCount: completedStreamsRecordCount,
            recordCountPrecision
        };

        returnPromiseResolve({
            schemas: Object.values(schemas),
            streamStats
        });
    };

    await moveToNextStream();

    return returnPromise;
}

function finalizeSchema(reachedEnd: boolean, schema: Schema): void {
    const properties = schema.properties as Properties;

    Object.values(properties).forEach((property) => {
        const types = Object.keys(property.valueTypes || {}) as ExtendedJSONSchema7TypeName[];
        property.type = mergeValueTypes(types);
        property.format = mergeValueFormats(property.format);
        mergeValueTypeStats(property);
    });

    // Convert binary boolean to number if number type exists in the same column
    if (schema.sampleRecords == null) schema.sampleRecords = [];
    const sampleRecords = schema.sampleRecords;
    sampleRecords.forEach((sample) => {
        Object.keys(sample).forEach((key) => {
            const property = properties[key];
            if (typeof sample[key] === "boolean" && !property.type?.includes("boolean")) {
                sample[key] = sample[key] ? 1 : 0;
            }
        });
    });

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

// TODO WRITE TESTS FOR THIS

export function mergeValueTypes(types: ExtendedJSONSchema7TypeName[]): JSONSchema7TypeName[] {
    let mergedTypes = [...types];
    if (mergedTypes.includes("date")) {
        mergedTypes = mergedTypes.join(",").replace("date", "string").split(",") as ExtendedJSONSchema7TypeName[];
    }
    if (mergedTypes.includes("binary")) {
        if (mergedTypes.includes("number")) {
            mergedTypes = mergedTypes.join(",").replace("binary", "number").split(",") as ExtendedJSONSchema7TypeName[];
        } else {
            mergedTypes = mergedTypes
                .join(",")
                .replace("binary", "boolean")
                .split(",") as ExtendedJSONSchema7TypeName[];
        }
    }
    mergedTypes = [...new Set(mergedTypes)].sort();
    return mergedTypes as JSONSchema7TypeName[];
}

export function mergeValueFormats(format?: string): string | undefined {
    let formats = format?.split(",");
    const mergeableTypes = [
        ["date", "date-time"],
        ["binary", "boolean"],
        ["binary", "integer"],
        ["binary", "number"]
    ];
    mergeableTypes.forEach((mergeableType) => {
        if (formats?.includes(mergeableType[0]) && formats?.includes(mergeableType[1])) {
            formats = formats.filter((format) => format !== mergeableType[0]);
        }
    });
    formats = formats?.join(",").replace("binary", "boolean").split(",");
    formats = [...new Set(formats)].sort();
    return formats?.join(",");
}

export function mergeValueTypeStats(property: Schema): void {
    const valueTypes = property.valueTypes as ValueTypes;
    const types = Object.keys(property.valueTypes || {}) as ExtendedJSONSchema7TypeName[];

    if (types.includes("binary")) {
        const binaryCount = valueTypes.binary.recordCount || 0;
        if (types.includes("number")) {
            const numberCount = valueTypes.number.recordCount || 0;
            valueTypes.number = {
                ...valueTypes.binary,
                ...valueTypes.number,
                recordCount: binaryCount + numberCount,
                stringOptions: {
                    ...valueTypes.binary.stringOptions,
                    ...valueTypes.number.stringOptions
                }
            };
            valueTypes.number.numberMaxValue = Math.max(
                valueTypes.number.numberMaxValue || Number.MIN_VALUE,
                ...Object.keys(valueTypes.binary.stringOptions || {}).map((value) => +value)
            );
            valueTypes.number.numberMinValue = Math.min(
                valueTypes.number.numberMinValue || Number.MAX_VALUE,
                ...Object.keys(valueTypes.binary.stringOptions || {}).map((value) => +value)
            );
        } else if (types.includes("boolean")) {
            const booleanCount = valueTypes.boolean.recordCount || 0;
            valueTypes.boolean = {
                ...valueTypes.binary,
                ...valueTypes.boolean,
                recordCount: binaryCount + booleanCount,
                stringOptions: {
                    ...valueTypes.binary.stringOptions,
                    ...valueTypes.boolean.stringOptions
                }
            };
        } else {
            valueTypes.boolean = {
                ...valueTypes.binary
            };
        }

        delete valueTypes.binary;
    }
}
