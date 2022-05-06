import chalk from "chalk";
import {
    SinkState,
    StreamState,
    CountPrecision,
    Properties,
    Schema,
    Source,
    RecordContext,
    RecordStreamContext,
    UpdateMethod,
    ParameterOption,
    ParameterAnswer,
    DPMRecordValue,
    Parameter,
    DPMConfiguration,
    DPMPropertyTypes
} from "datapm-lib";
import moment from "moment";
import numeral from "numeral";
import { PassThrough, Readable, Transform } from "stream";
import { Maybe } from "../util/Maybe";
import {
    InspectionResults,
    StreamAndTransforms,
    StreamSetPreview,
    ExtendedJSONSchema7TypeName,
    StreamSummary
} from "../connector/Source";
import { mergeValueFormats } from "../connector/SourceUtil";
import { getConnectorDescriptionByType } from "../connector/ConnectorUtil";
import { obtainCredentialsConfiguration } from "./CredentialsUtil";
import { BatchingTransform } from "../transforms/BatchingTransform";
import { JobContext } from "../task/JobContext";
import { JSONSchema7TypeName } from "json-schema";
import { repeatedlyPromptParameters } from "./parameters/ParameterUtils";
import { obtainConnectionConfiguration } from "./ConnectionUtil";
import { createUTCDateTimeFromString, isDate, isDateTime } from "./DateUtil";
import isNumber from "is-number";

export enum DeconflictOptions {
    CAST_TO_BOOLEAN = "CAST_TO_BOOLEAN",
    CAST_TO_INTEGER = "CAST_TO_INTEGER",
    CAST_TO_DOUBLE = "CAST_TO_DOUBLE",
    CAST_TO_DATE = "CAST_TO_DATE",
    CAST_TO_STRING = "CAST_TO_STRING",
    CAST_TO_NULL = "CAST_TO_NULL",
    SKIP = "SKIP",
    ALL = "ALL"
}

export interface RecordStreamEventContext {
    startingStream(
        streamSlug: string,
        expectedRecordCount: number | undefined,
        expectedByteCount: number | undefined
    ): void;

    waitingToReconnect(streamSlug: string): void;

    connecting(streamSlug: string): void;

    /** The number of bytes received in total, since staring the stream */
    bytesReceived(streamSlug: string, byteCount: number): void;
}

type InternalSourceInspectionResults = InspectionResults & {
    additionalConnectionConfiguration: DPMConfiguration;
    additionalConfiguration: DPMConfiguration;
};

/** Given a source, run an inspection. This is useful to determine if anything has changed before
 * fetching data unnecessarily.
 */
export async function inspectSourceConnection(
    jobContext: JobContext,
    source: Source,
    defaults: boolean | undefined
): Promise<InternalSourceInspectionResults> {
    const connectorDescription = getConnectorDescriptionByType(source.type);

    if (connectorDescription == null) throw new Error(`Unable to find connector for type ${source.type}`);

    const connector = await connectorDescription.getConnector();

    const connectionParameters: Parameter<string>[] = [];

    let additionalConnectionConfiguration: DPMConfiguration = {};

    if (connector.requiresConnectionConfiguration()) {
        // Listen for answers during the inspection, and add these to the source configuration
        const promptAnswerListener = (answers: ParameterAnswer<string>) => {
            additionalConnectionConfiguration = {
                ...additionalConnectionConfiguration,
                ...answers
            };
        };

        jobContext.addAnswerListener(promptAnswerListener);

        await obtainConnectionConfiguration(jobContext, connector, source.connectionConfiguration, undefined, defaults);

        jobContext.removeAnswerListener(promptAnswerListener);
    }

    const repositoryIdentifier = await connector.getRepositoryIdentifierFromConfiguration(
        source.connectionConfiguration
    );

    let credentialsConfiguration = {};

    if (source.credentialsIdentifier) {
        try {
            credentialsConfiguration =
                (await jobContext.getRepositoryCredential(
                    connector.getType(),
                    repositoryIdentifier,
                    source.credentialsIdentifier
                )) ?? {};
        } catch (error) {
            jobContext.print("WARN", "The credential " + source.credentialsIdentifier + " could not be found or read.");
        }
    }

    credentialsConfiguration = await obtainCredentialsConfiguration(
        jobContext,
        connector,
        source.connectionConfiguration,
        credentialsConfiguration,
        false,
        undefined,
        defaults
    );

    const sourceDescription = await connectorDescription.getSourceDescription();

    if (sourceDescription == null) throw new Error(`Unable to find source description for type ${source.type}`);

    const sourceImplementation = await sourceDescription.getSource();

    jobContext.print("INFO", "Connecting to " + repositoryIdentifier);

    let additionalConfiguration: DPMConfiguration = {};
    // Listen for answers during the inspection, and add these to the source configuration
    const promptAnswerListener = (answers: ParameterAnswer<string>) => {
        additionalConfiguration = {
            ...additionalConfiguration,
            ...answers
        };
    };

    jobContext.addAnswerListener(promptAnswerListener);

    const inspectionResults = await sourceImplementation.inspectData(
        source.connectionConfiguration,
        credentialsConfiguration,
        source.configuration || {},
        jobContext
    );

    jobContext.removeAnswerListener(promptAnswerListener);

    return {
        ...inspectionResults,
        additionalConnectionConfiguration,
        additionalConfiguration
    };
}
export async function streamRecords(
    source: Source,
    streamSetPreview: StreamSetPreview,
    context: RecordStreamEventContext,
    schemas: Schema[],
    sinkState: Maybe<SinkState>,
    sinkSupportedUpdateMethods: UpdateMethod[],
    deconflictOptions?: Record<string, DeconflictOptions> | null
): Promise<{ readable: Readable; getCurrentUpdateMethod: () => UpdateMethod }> {
    const returnReadable = new Transform({
        objectMode: true,
        transform: (chunk, _encoding, callback) => {
            callback(null, chunk);
        }
    });

    let transform: Transform;

    let index = 0;

    let updateMethod = UpdateMethod.BATCH_FULL_SET;

    let lastConnectedDate: Date = new Date();

    let currentStreamSummary: StreamSummary | null = null;

    let currentStreamAndTransform: StreamAndTransforms | null = null;

    const usr1Handler = () => {
        if (currentStreamAndTransform) currentStreamAndTransform.stream.emit("close");
    };

    process.on("SIGUSR1", usr1Handler);

    const moveToNextStream = async function () {
        if (currentStreamSummary?.updateMethod === UpdateMethod.CONTINUOUS) {
            const currenDate: Date = new Date();
            const timeSinceLastConnected = currenDate.getTime() - lastConnectedDate?.getTime();

            const waitMilliseconds = Math.min(timeSinceLastConnected * 10, 30000);

            context.waitingToReconnect(currentStreamSummary.name);
            await new Promise((resolve) => setTimeout(resolve, waitMilliseconds));
        } else if (streamSetPreview.streamSummaries) {
            currentStreamSummary = streamSetPreview.streamSummaries?.[index++];
        } else {
            const streamSummary = (await streamSetPreview.moveToNextStream?.()) || null;
            currentStreamSummary = streamSummary;
        }

        if (currentStreamSummary == null) {
            process.off("SIGUSR1", usr1Handler);
            returnReadable.end(); // VERY IMPORTANT use end not ".push(null)"
            return;
        }

        const streamUpdateMethod = currentStreamSummary.updateMethod;

        if (!sinkSupportedUpdateMethods.find((s) => s === streamUpdateMethod)) {
            throw new Error(
                "Source update method: " +
                    streamUpdateMethod +
                    " and sink only supports update methods " +
                    sinkSupportedUpdateMethods.join(",") +
                    " Therefore there is no way to stream from this source to this sink"
            ); // TODO This could be more leanient, but warn of lost or duplicated data
        }

        updateMethod =
            streamUpdateMethod !== UpdateMethod.BATCH_FULL_SET &&
            sinkSupportedUpdateMethods.includes(streamUpdateMethod)
                ? streamUpdateMethod
                : UpdateMethod.BATCH_FULL_SET;

        if (updateMethod === UpdateMethod.BATCH_FULL_SET) sinkState = null;

        const streamState = sinkState?.streamSets[streamSetPreview.slug]?.streamStates[currentStreamSummary.name];

        context.connecting(currentStreamSummary.name);

        try {
            currentStreamAndTransform = await currentStreamSummary.openStream(streamState || null);
        } catch (error) {
            if (currentStreamSummary.updateMethod === UpdateMethod.CONTINUOUS) {
                setTimeout(moveToNextStream, 1); // clear call stack and try again
                return;
            }
            throw error;
        }

        if (transform != null) {
            transform.removeAllListeners();
        }

        context.startingStream(
            currentStreamSummary.name,
            currentStreamAndTransform.expectedRecordCount,
            currentStreamAndTransform.expectedTotalRawBytes
        );

        transform = createStreamAndTransformPipeLine(
            currentStreamSummary,
            context,
            source,
            streamSetPreview,
            streamState,
            currentStreamAndTransform,
            schemas,
            deconflictOptions
        );

        transform.on("data", (chunk) => {
            const ok = returnReadable.write(chunk);

            if (!ok) {
                transform.pause();
                returnReadable.once("drain", () => {
                    transform.resume();
                });
            }
        });

        transform.on("error", (error: Error) => {
            returnReadable.emit("error", error);
        });

        transform.on("close", () => {
            // jobContext.print("NONE", "streamStatusTransform closed");
        });

        transform.on("end", () => {
            lastConnectedDate = new Date();
            moveToNextStream();
        });
    };

    await moveToNextStream();

    return {
        readable: returnReadable,
        getCurrentUpdateMethod() {
            return updateMethod;
        }
    };
}

function createStreamAndTransformPipeLine(
    streamSummary: StreamSummary,
    context: RecordStreamEventContext,
    source: Source,
    streamSetPreview: StreamSetPreview,
    streamState: StreamState | undefined,
    streamAndTransforms: StreamAndTransforms,
    schemas: Schema[],
    deconflictOptions?: Record<string, DeconflictOptions> | null
): Transform {
    let lastTransform: Readable | Transform = streamAndTransforms.stream;

    if (!lastTransform.readableObjectMode) {
        let bytesTotal = 0;

        let lastUpdateTime = new Date().getTime();
        const countBytes: PassThrough = new PassThrough({
            transform: (chunk, _encoding, callback) => {
                bytesTotal += chunk.length;

                const currentTime = new Date().getTime();

                if (currentTime - lastUpdateTime > 500) {
                    lastUpdateTime = currentTime;
                    context.bytesReceived(streamSummary.name, bytesTotal);
                }

                callback(null, chunk);
            }
        });
        lastTransform = lastTransform.pipe(countBytes);
    }

    if (streamAndTransforms.transforms) {
        for (const transform of streamAndTransforms.transforms) {
            lastTransform = lastTransform.pipe(transform);
        }
    }
    // TODO there will be memory impacts for doing this, very large records will cause memory issues
    lastTransform = lastTransform.pipe(new BatchingTransform(1000, 100));

    if (streamState != null && streamState.streamOffset != null) {
        const streamOffSetTransform = new Transform({
            objectMode: true,
            transform: function (chunks: RecordContext[], _encoding, callback) {
                const chunksToSend: RecordContext[] = [];

                for (const chunk of chunks) {
                    if (chunk.offset == null || streamState.streamOffset == null) {
                        chunksToSend.push(chunk);
                        continue;
                    }

                    if (chunk.offset > streamState.streamOffset) {
                        chunksToSend.push(chunk);
                        continue;
                    }
                }

                callback(null, chunksToSend);
            }
        });
        lastTransform = lastTransform.pipe(streamOffSetTransform);
    }

    const streamContextTransform = new Transform({
        objectMode: true,
        transform: function (chunks: RecordContext[], _encoding, callback) {
            const chunksToSend: RecordStreamContext[] = [];

            for (const chunk of chunks) {
                const recordStreamContext: RecordStreamContext = {
                    recordContext: chunk,
                    sourceType: source.type,
                    sourceSlug: source.slug,
                    streamSetSlug: streamSetPreview.slug,
                    streamSlug: streamSummary.name
                };

                chunksToSend.push(recordStreamContext);
            }

            callback(null, chunksToSend);
        }
    });

    lastTransform = lastTransform.pipe(streamContextTransform);

    const sanitizeTransform = new Transform({
        objectMode: true,
        transform: function (chunks: RecordStreamContext[], _encoding, callback) {
            for (const chunk of chunks) {
                const schema = schemas.find((s) => s.title === chunk.recordContext.schemaSlug);

                // TODO - Handle creating schema updates on the fly
                if (schema == null) throw new Error("SCHEMA_UNKNOWN - " + chunk.recordContext.schemaSlug);

                for (const propertyName in schema.properties) {
                    const property = schema.properties[propertyName];

                    if (property.hidden) {
                        delete chunk.recordContext.record[propertyName];
                    } else if (property.title != null && property.title !== propertyName) {
                        chunk.recordContext.record[property.title] = chunk.recordContext.record[propertyName];
                        delete chunk.recordContext.record[propertyName];
                    }
                }
            }

            callback(null, chunks);
        }
    });
    lastTransform = lastTransform.pipe(sanitizeTransform);

    if (deconflictOptions) {
        const deconflictTransform = new Transform({
            objectMode: true,
            transform: function (chunks: RecordStreamContext[], _encoding, callback) {
                const chunksToSend: RecordStreamContext[] = [];

                for (const chunk of chunks) {
                    let shouldSkip = false;
                    for (const title in deconflictOptions) {
                        const deconflictOption = deconflictOptions[title];
                        const deconflictedValue = resolveConflict(
                            chunk.recordContext.record[title] as string,
                            deconflictOption
                        );
                        if (deconflictedValue === null) {
                            shouldSkip = true;
                            break;
                        } else {
                            chunk.recordContext.record[title] = deconflictedValue;
                        }
                    }
                    if (!shouldSkip) {
                        chunksToSend.push(chunk);
                    }
                }

                if (chunksToSend.length > 0) this.push(chunksToSend);

                callback(null);
            }
        });
        lastTransform = lastTransform.pipe(deconflictTransform);
    }

    return lastTransform as Transform;
}

export async function checkSchemaDataTypeConflicts(schema: Schema): Promise<Record<string, string[]>> {
    const propertyTypes: Record<string, string> = {};

    if (schema.properties == null) throw new Error("SCHEMA_HAS_NO_PROPERTIES");

    for (const property of Object.values(schema.properties)) {
        if (property.type == null || property.title == null) continue;

        const valueType: { type: ExtendedJSONSchema7TypeName; format?: string } = {
            type: property.type as "string" | "number" | "integer" | "boolean" | "object" | "array" | "null",
            format: property.format
        };
        if (valueType.format) {
            if (!propertyTypes[property.title]) {
                propertyTypes[property.title] = valueType.format;
            } else if (!propertyTypes[property.title].split(",").includes(valueType.format)) {
                propertyTypes[property.title] += `,${valueType.format}`;
            }
        }
    }
    const conflictedPropertyTypes: Record<string, string[]> = {};
    Object.keys(propertyTypes).forEach((title) => {
        const valueTypes = (mergeValueFormats(propertyTypes[title]) as string)
            .replace("date-time", "date")
            .split(",")
            .filter((valueType) => valueType !== "null")
            .sort();
        if (valueTypes.length > 1) {
            conflictedPropertyTypes[title] = valueTypes;
        }
    });

    return conflictedPropertyTypes;
}

export function getDeconflictChoices(valueTypes: string[]): ParameterOption[] {
    const nonStringValueType = valueTypes.filter((valueType) => valueType !== "string")[0];
    const deconflictChoices = {
        [DeconflictOptions.CAST_TO_BOOLEAN]: {
            title: "Cast all values as boolean",
            value: DeconflictOptions.CAST_TO_BOOLEAN
        },
        [DeconflictOptions.CAST_TO_INTEGER]: {
            title: "Cast all values as integer",
            value: DeconflictOptions.CAST_TO_INTEGER
        },
        [DeconflictOptions.CAST_TO_DOUBLE]: {
            title: "Cast all values as double",
            value: DeconflictOptions.CAST_TO_DOUBLE
        },
        [DeconflictOptions.CAST_TO_DATE]: {
            title: "Cast all values as date",
            value: DeconflictOptions.CAST_TO_DATE
        },
        [DeconflictOptions.CAST_TO_STRING]: {
            title: "Cast all values as string",
            value: DeconflictOptions.CAST_TO_STRING
        },
        [DeconflictOptions.CAST_TO_NULL]: {
            title: `Output ${nonStringValueType}, otherwise cast to null`,
            value: DeconflictOptions.CAST_TO_NULL
        },
        [DeconflictOptions.SKIP]: {
            title: `Output ${nonStringValueType}, otherwise skip record`,
            value: DeconflictOptions.SKIP
        },
        [DeconflictOptions.ALL]: {
            title: "Output all value types",
            value: DeconflictOptions.ALL
        }
    };
    const deconflictOptions: Record<string, DeconflictOptions[]> = {
        // BOOLEAN
        "boolean,date": [DeconflictOptions.CAST_TO_STRING, DeconflictOptions.ALL],
        "boolean,integer": [
            DeconflictOptions.CAST_TO_BOOLEAN,
            DeconflictOptions.CAST_TO_INTEGER,
            DeconflictOptions.ALL
        ],
        "boolean,number": [DeconflictOptions.CAST_TO_BOOLEAN, DeconflictOptions.CAST_TO_DOUBLE, DeconflictOptions.ALL],
        "boolean,string": [
            DeconflictOptions.CAST_TO_STRING,
            DeconflictOptions.CAST_TO_NULL,
            DeconflictOptions.SKIP,
            DeconflictOptions.ALL
        ],
        // DATE
        "date,integer": [
            DeconflictOptions.CAST_TO_INTEGER,
            DeconflictOptions.CAST_TO_DATE,
            DeconflictOptions.CAST_TO_STRING,
            DeconflictOptions.ALL
        ],
        "date,number": [DeconflictOptions.CAST_TO_STRING, DeconflictOptions.ALL],
        "date,string": [DeconflictOptions.CAST_TO_STRING, DeconflictOptions.CAST_TO_NULL, DeconflictOptions.SKIP],
        // INTEGER
        "integer,number": [DeconflictOptions.CAST_TO_DOUBLE, DeconflictOptions.CAST_TO_STRING, DeconflictOptions.ALL],
        "integer,string": [
            DeconflictOptions.CAST_TO_STRING,
            DeconflictOptions.CAST_TO_NULL,
            DeconflictOptions.SKIP,
            DeconflictOptions.ALL
        ],
        // DOUBLE
        "number,string": [
            DeconflictOptions.CAST_TO_STRING,
            DeconflictOptions.CAST_TO_NULL,
            DeconflictOptions.SKIP,
            DeconflictOptions.ALL
        ]
    };
    let promptChoices = [];
    if (valueTypes.length > 2) {
        promptChoices = [DeconflictOptions.CAST_TO_STRING, DeconflictOptions.ALL];
    } else {
        const valueTypeList = valueTypes.join(",");
        promptChoices = deconflictOptions[valueTypeList];
    }
    return promptChoices.map((promptChoice) => deconflictChoices[promptChoice]);
}

export function updateSchemaWithDeconflictOptions(
    schema: Schema,
    deconflictOptions: Record<string, DeconflictOptions>
): void {
    const properties = schema.properties as Properties;
    const deconflictRules = {
        [DeconflictOptions.CAST_TO_BOOLEAN]: "boolean",
        [DeconflictOptions.CAST_TO_INTEGER]: "integer",
        [DeconflictOptions.CAST_TO_DOUBLE]: "number",
        [DeconflictOptions.CAST_TO_DATE]: "date-time",
        [DeconflictOptions.CAST_TO_STRING]: "string"
    };
    for (const title in deconflictOptions) {
        const property = Object.values(properties).find((p) => p.title === title);

        if (property == null) throw new Error("Could not find property with title: " + title);

        const deconflictOption = deconflictOptions[title];
        if (deconflictOption === DeconflictOptions.ALL) {
            continue;
        }
        let format = "";
        if (deconflictOption === DeconflictOptions.SKIP || deconflictOption === DeconflictOptions.CAST_TO_NULL) {
            format = property.format?.split(",").find((format) => format !== "null" && format !== "string") as string;
        } else {
            format = deconflictRules[deconflictOption];
        }

        const nullIncluded = property.format && property.format?.includes("null");

        property.format = nullIncluded ? `null,${format}` : format;

        if (property.format === "string") {
            property.type = ["string"];
        }

        if (nullIncluded) {
            (property.type as JSONSchema7TypeName[]).push("null");
        }
    }
}

export function resolveConflict(value: DPMRecordValue, deconflictOption: DeconflictOptions): DPMRecordValue {
    if (value === "null") return value;
    if (value == null) return value;

    if (deconflictOption === DeconflictOptions.ALL) return value;
    const valueType = discoverValueType(value);
    const typeConvertedValue = convertValueByValueType(value, valueType);
    if (deconflictOption === DeconflictOptions.SKIP) {
        if (valueType.type !== "string") return value;
        return null;
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_NULL) {
        if (valueType.type !== "string") return value;
        return "null";
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_BOOLEAN) {
        if (valueType.type === "boolean") return typeConvertedValue;
        if (valueType.type === "number" || valueType.type === "integer")
            return ((typeConvertedValue as number) > 0).toString();
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_INTEGER) {
        if (valueType.type === "integer") return value;
        if (valueType.type === "number") return Math.round(typeConvertedValue as number);
        if (valueType.type === "boolean") return typeConvertedValue ? "1" : "0";
        if (valueType.type === "date") {
            return (typeConvertedValue as Date).getTime().toString();
        }
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_DOUBLE) {
        if (valueType.format === "number") return value;
        if (valueType.type === "boolean") return typeConvertedValue ? "1.0" : "0.0";
        if (valueType.format === "integer") return `${typeConvertedValue}.0`;
        if (valueType.type === "binary") return typeConvertedValue ? "1.0" : "0.0";
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_DATE) {
        if (valueType.type === "date-time") return value;
        if (valueType.format === "integer")
            return moment(new Date(typeConvertedValue as number))
                .utc()
                .format("YYYY-MM-DD HH:mm:ss");
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_STRING) {
        return value;
    }
    return null;
}

/** Prints only the record count and property info for the schema.
 * Does not print the schema title, because that is expected to printed
 * in context before this method is called.
 */
export function printSchema(jobContext: JobContext, schema: Schema): void {
    let recordCount = numeral(schema.recordCount).format("0,0");

    if (schema.recordCount != null && schema.recordCount > 1000000)
        recordCount = numeral(schema.recordCount).format("0.0 a");

    if (schema.recordCountPrecision === CountPrecision.APPROXIMATE) recordCount = "~" + recordCount;
    else if (schema.recordCountPrecision === CountPrecision.GREATER_THAN) recordCount = ">" + recordCount;

    if (schema.title === undefined) {
        throw new Error("Schema title is undefined");
    }

    // Title is expected to be printed before this method is called

    if (schema.properties == null || Object.keys(schema.properties).length === 0) {
        jobContext.print("WARN", "Has no properties");
        return;
    }

    jobContext.print("NONE", `${chalk.gray("Record Count: ")} ${chalk.yellow(recordCount)}`);
    jobContext.print("NONE", chalk.gray("Attributes"));

    if (!schema.properties) {
        throw new Error("This schema has no properties, and therefore is not very useful");
    }

    Object.keys(schema.properties).forEach((propertyTitle) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const schemaProperty = schema.properties![propertyTitle];

        if (!schemaProperty.valueTypes) {
            throw new Error("This schema property has no value types, and therefore is not very useful");
        }

        const valueTypes = Object.values(schemaProperty.valueTypes).map((valueStats) => {
            if (valueStats.recordCount == null || schema.recordsInspectedCount == null) {
                return valueStats.valueType;
            }
            if (schema.recordCount) {
                const percent = (valueStats.recordCount / schema.recordCount) * 100;
                return `${valueStats.valueType}(${percent.toFixed(2)}%)`;
            } else {
                return `${valueStats.valueType}`;
            }
        });

        jobContext.print(
            "NONE",
            `- ${chalk.yellow(propertyTitle)}\n    ${chalk.grey("Types: ")} ${
                schemaProperty.type === "array" ? "Array-" : ""
            }${valueTypes.join(", ")}`
        );

        const notHiddenLabels = Object.values(schemaProperty.valueTypes)
            ?.flatMap((vt) => vt.contentLabels || [])
            ?.filter((l) => l.hidden !== true);

        if (notHiddenLabels && notHiddenLabels?.length > 0) {
            const labels = notHiddenLabels
                ?.map((l) => l.label + (l.ocurrenceCount ? "(" + numeral(l.ocurrenceCount).format("0,0") + ")" : ""))
                .join(", ");
            jobContext.print("NONE", `    ${chalk.grey("Content:")} ${labels}`);
        }

        jobContext.print("NONE", " ");
    });
}

export function discoverValueType(value: DPMRecordValue): { type: DPMPropertyTypes; format?: string } {
    if (value === null) return { type: "null", format: "null" };

    if (typeof value === "bigint") return { type: "number", format: "integer" };

    if (typeof value === "string") return discoverValueTypeFromString(value as string);

    if (Array.isArray(value)) return { type: "array", format: "array" };

    if (value instanceof Date) return { type: "date", format: "date-time" };

    if (typeof value === "number") {
        const strValue = value.toString();
        if (strValue.indexOf(".") === -1) {
            return { type: "integer", format: "integer" };
        }
        return { type: "number", format: "number" };
    }

    // TODO handle object and array better
    return {
        type: typeof value as "boolean" | "number" | "object",
        format: typeof value as "boolean" | "number" | "object"
    };
}

export function discoverValueTypeFromString(value: string): { type: DPMPropertyTypes; format?: string } {
    if (value === "null") return { type: "null", format: "null" };

    if (value.trim() === "") return { type: "null", format: "null" };

    const booleanValues = ["true", "false", "yes", "no"];

    if (booleanValues.includes(value.trim().toLowerCase())) return { type: "boolean", format: "boolean" };

    if (isNumber(value.toString())) {
        const trimmedValue = value.trim();

        if (value === "0") return { type: "integer", format: "integer" };

        // Find doubles with no more than one preceding zero before a period
        if (trimmedValue.match(/^[-+]?(?:(?:[1-9][\d,]*)|0)\.\d+$/)) {
            return { type: "number", format: "number" };

            // Find integers, no leading zeros, only three numbers between commas, no other characters, allows leading +/-
        } else if (trimmedValue.match(/^[-+]?(?![\D0])(?:\d+(?:(?<!\d{4}),(?=\d{3}(?:,|$)))?)+$|^0$/)) {
            return { type: "integer", format: "integer" };
        }
    }

    if (isDate(value)) {
        return { type: "date", format: "date" };
    } else if (isDateTime(value)) {
        return { type: "date-time", format: "date-time" };
    }

    return { type: "string", format: "string" };
}

/** Given a value, convert it to a specific value type. Example: boolean from string */
export function convertValueByValueType(
    value: DPMRecordValue,
    valueType: { type: DPMPropertyTypes; format?: string } // TODO should this be DPMRecordValue??
): DPMRecordValue {
    if (value == null) return null;

    if (valueType.type === "null") {
        return null;
    } else if (valueType.type === "string") {
        if (typeof value === "string") return value;
        return value.toString();
    } else if (valueType.type === "boolean" || valueType.type === "binary") {
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return (value as number) > 0;
        if (typeof value === "string") {
            if (isNumber(value)) {
                return Number.parseInt(value) > 0;
            }
            const stringValue = (value as string).trim().toLowerCase();
            return stringValue === "true" || stringValue === "yes";
        }
    } else if (valueType.type === "number") {
        if (typeof value === "boolean") return (value as boolean) ? 1 : 0;
        if (typeof value === "number") return value;
        if (typeof value === "string") return +value;
    } else if (valueType.type === "integer") {
        if (typeof value === "boolean") return (value as boolean) ? 1 : 0;
        if (typeof value === "number") return Math.round(value);
        if (typeof value === "string") return Math.round(+value);
    } else if (valueType.type === "date") {
        try {
            return createUTCDateTimeFromString(value as string); // TODO - this is probably not right for all situations
        } catch (err) {
            return value;
        }
    } else if (valueType.type === "date-time") {
        try {
            return createUTCDateTimeFromString(value as string); // TODO - this is probably not right for all situations
        } catch (err) {
            return value;
        }
    }

    // TODO recursively handle arrays and object
    throw new Error(
        `UNABLE_TO_CONVERT_TYPE ${typeof value} to ${valueType.type} ${
            valueType.format ? " with format " + valueType.format : ""
        }`
    );
}

export function convertToJSONSchema7TypeName(type: DPMPropertyTypes): DPMPropertyTypes {
    return type.replace("binary", "boolean") as DPMPropertyTypes;
}
