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
    ParameterAnswer
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
import { convertValueByValueType, discoverValueType } from "../transforms/StatsTransform";
import { mergeValueFormats } from "../connector/SourceUtil";
import { getConnectorDescriptionByType } from "../connector/ConnectorUtil";
import { obtainCredentialsConfiguration } from "./CredentialsUtil";
import { BatchingTransform } from "../transforms/BatchingTransform";
import { JobContext } from "../task/Task";

export enum DeconflictOptions {
    CAST_TO_BOOLEAN = "CAST_TO_BOOLEAN",
    CAST_TO_INTEGER = "CAST_TO_INTEGER",
    CAST_TO_FLOAT = "CAST_TO_FLOAT",
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

    /** The number of bytes received in total, since staring the stream */
    bytesReceived(streamSlug: string, byteCount: number): void;
}

/** Given a source, run an inspection results. This is useful to determine if anything has changed before
 * fetching data unnecessarily.
 */
export async function inspectSourceConnection(
    jobContext: JobContext,
    source: Source,
    defaults: boolean | undefined
): Promise<InspectionResults> {
    const connectorDescription = getConnectorDescriptionByType(source.type);

    if (connectorDescription == null) throw new Error(`Unable to find connector for type ${source.type}`);

    const connector = await connectorDescription.getRepository();

    const connectionParameters = await connector.getConnectionParameters(source.connectionConfiguration);

    if (connectionParameters.length > 0) {
        throw new Error(
            "SOURCE_CONNECTION_NOT_COMPLETE - The package maintianer needs to run the `datapm update ...` command to provide more connection information."
        );
    }

    const connectionIdentifier = await connector.getRepositoryIdentifierFromConfiguration(
        source.connectionConfiguration
    );

    let credentialsConfiguration = {};

    if (source.credentialsIdentifier) {
        try {
            credentialsConfiguration = await jobContext.getRepositoryCredential(
                connector.getType(),
                connectionIdentifier,
                source.credentialsIdentifier
            );
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
        defaults
    );

    const sourceDescription = await connectorDescription.getSourceDescription();

    if (sourceDescription == null) throw new Error(`Unable to find source description for type ${source.type}`);

    const sourceImplementation = await sourceDescription.getSource();

    const sourceInspectResult = await sourceImplementation.inspectURIs(
        source.connectionConfiguration,
        credentialsConfiguration,
        source.configuration || {},
        {
            defaults: true,
            quiet: true,
            jobContext,
            print: (message: string) => {
                jobContext.print("NONE", message);
            },
            parameterPrompt: async (parameters): Promise<ParameterAnswer<string>> => {
                for (const parameter of parameters) {
                    if (parameter.defaultValue == null) {
                        throw new Error(
                            "SOURCE_CONFIGURATION_NOT_COMPLETE - Missing value for parameter " +
                                parameter.name +
                                " from source " +
                                source.slug +
                                ", and no default is provided. The package owner needs to run the `datapm update ...` command to make it compatible with this version of datapm"
                        );
                    }

                    if (source.configuration == null) source.configuration = {};

                    source.configuration[parameter.name] = parameter.defaultValue;
                }

                return source.configuration || {};
            }
        }
    );

    return sourceInspectResult;
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
        transform: (chunk, encoding, callback) => {
            callback(null, chunk);
        }
    });

    let transform: Transform;

    let index = 0;

    const getCurrentUpdateMethod = UpdateMethod.BATCH_FULL_SET;

    const moveToNextStream = async function () {
        let currentStreamSummary: StreamSummary;
        if (streamSetPreview.streamSummaries) {
            currentStreamSummary = streamSetPreview.streamSummaries?.[index++];
            if (currentStreamSummary == null) {
                returnReadable.end(); // VERY IMPORTANT use end not ".push(null)"
                return;
            }
        } else {
            const streamSummary = await streamSetPreview.moveToNextStream?.();
            if (!streamSummary) {
                returnReadable.end(); // VERY IMPORTANT use end not ".push(null)"
                return;
            }
            currentStreamSummary = streamSummary;
        }

        const streamSupportedUpdateMethod = currentStreamSummary.updateMethod;

        if (!sinkSupportedUpdateMethods.find((s) => s === streamSupportedUpdateMethod)) {
            throw new Error(
                "Source update method: " +
                    streamSupportedUpdateMethod +
                    " and sink only supports update methods " +
                    sinkSupportedUpdateMethods.join(",") +
                    " Therefore there is no way to stream from this source to this sink"
            ); // TODO This could be more leanient, but warn of lost or duplicated data
        }

        let updateMethod =
            streamSupportedUpdateMethod === UpdateMethod.APPEND_ONLY_LOG &&
            sinkSupportedUpdateMethods.includes(UpdateMethod.APPEND_ONLY_LOG)
                ? UpdateMethod.APPEND_ONLY_LOG
                : UpdateMethod.BATCH_FULL_SET;

        if (sinkState == null) updateMethod = UpdateMethod.BATCH_FULL_SET;

        if (updateMethod === UpdateMethod.BATCH_FULL_SET) sinkState = null;

        const streamState = sinkState?.streamSets[streamSetPreview.slug]?.streamStates[currentStreamSummary.name];

        const currentStreamAndTransform = await currentStreamSummary.openStream(streamState || null);

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
            moveToNextStream();
        });
    };

    await moveToNextStream();

    return {
        readable: returnReadable,
        getCurrentUpdateMethod() {
            return getCurrentUpdateMethod;
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
            transform: (chunk, encoding, callback) => {
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
    lastTransform = lastTransform.pipe(new BatchingTransform(100));

    if (streamState != null && streamState.streamOffset != null) {
        const streamOffSetTransform = new Transform({
            objectMode: true,
            transform: function (chunks: RecordContext[], encoding, callback) {
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
        transform: function (chunks: RecordContext[], encoding, callback) {
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
        transform: function (chunks: RecordStreamContext[], encoding, callback) {
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
            transform: function (chunks: RecordStreamContext[], encoding, callback) {
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
        [DeconflictOptions.CAST_TO_FLOAT]: {
            title: "Cast all values as float",
            value: DeconflictOptions.CAST_TO_FLOAT
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
        "boolean,number": [DeconflictOptions.CAST_TO_BOOLEAN, DeconflictOptions.CAST_TO_FLOAT, DeconflictOptions.ALL],
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
        "integer,number": [DeconflictOptions.CAST_TO_FLOAT, DeconflictOptions.CAST_TO_STRING, DeconflictOptions.ALL],
        "integer,string": [
            DeconflictOptions.CAST_TO_STRING,
            DeconflictOptions.CAST_TO_NULL,
            DeconflictOptions.SKIP,
            DeconflictOptions.ALL
        ],
        // FLOAT
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
        [DeconflictOptions.CAST_TO_FLOAT]: "number",
        [DeconflictOptions.CAST_TO_DATE]: "date-time",
        [DeconflictOptions.CAST_TO_STRING]: "string"
    };
    for (const title in deconflictOptions) {
        const property = properties[title];
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
        property.format = property.format?.includes("null") ? `null,${format}` : format;
    }
}

export function resolveConflict(value: string, deconflictOption: DeconflictOptions): string | null {
    if (value === "null") return value;
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
        if (valueType.type === "boolean") return value;
        if (valueType.type === "number") return (+value > 0).toString();
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_INTEGER) {
        if (valueType.format === "integer") return value;
        if (valueType.type === "boolean") return typeConvertedValue ? "1" : "0";
        if (valueType.type === "date") {
            return (typeConvertedValue as Date).getTime().toString();
        }
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_FLOAT) {
        if (valueType.format === "number") return value;
        if (valueType.type === "boolean") return typeConvertedValue ? "1.0" : "0.0";
        if (valueType.format === "integer") return `${value}.0`;
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_DATE) {
        if (valueType.type === "date") return value;
        if (valueType.format === "integer")
            return moment(new Date(+value))
                .utc()
                .format("YYYY-MM-DD HH:mm:ss");
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_STRING) {
        return value;
    }
    return null;
}

export function printSchema(jobContext: JobContext, schema: Schema): void {
    let recordCount = numeral(schema.recordCount).format("0,0");

    if (schema.recordCount != null && schema.recordCount > 1000000)
        recordCount = numeral(schema.recordCount).format("0.0 a");

    if (schema.recordCountPrecision === CountPrecision.APPROXIMATE) recordCount = "~" + recordCount;
    else if (schema.recordCountPrecision === CountPrecision.GREATER_THAN) recordCount = ">" + recordCount;

    if (schema.title === undefined) {
        throw new Error("Schema title is undefined");
    }

    jobContext.print("NONE", schema.title);

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
    });
}
