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
    DPMPropertyTypes,
    ValueTypeStatistics,
    Property,
    ValueTypes,
    ContentLabel
} from "datapm-lib";
import moment from "moment";
import numeral from "numeral";
import { PassThrough, Readable, Transform } from "stream";
import { RecordStreamContextTransform } from "../transforms/RecordStreamContextTransform";
import { Maybe } from "../util/Maybe";
import { InspectionResults, StreamAndTransforms, StreamSetPreview, StreamSummary } from "../connector/Source";
import { getConnectorDescriptionByType } from "../connector/ConnectorUtil";
import { obtainCredentialsConfiguration } from "./CredentialsUtil";
import { BatchingTransform } from "../transforms/BatchingTransform";
import { JobContext } from "../task/JobContext";
import { obtainConnectionConfiguration } from "./ConnectionUtil";
import { createUTCDateTimeFromString, isDate, isDateTime, _isDate } from "./DateUtil";
import isNumber from "is-number";
import { PackageIdentifierInput } from "../main";

export const SAMPLE_RECORD_COUNT_MAX = 100;

export enum DeconflictOptions {
    CAST_TO_BOOLEAN = "CAST_TO_BOOLEAN",
    CAST_TO_INTEGER = "CAST_TO_INTEGER",
    CAST_TO_DOUBLE = "CAST_TO_DOUBLE",
    CAST_TO_DATE = "CAST_TO_DATE",
    CAST_TO_DATE_TIME = "CAST_TO_DATE_TIME",
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
    credentialsIdentifier: string | undefined;
    additionalConfiguration: DPMConfiguration;
};

/** Given a source, run an inspection. This is useful to determine if anything has changed before
 * fetching data unnecessarily.
 *
 * @param source The source to inspect
 * @param context The context to use for inspection
 * @param configuration The configuration to use for inspection
 * @param jobContext The job context to use for inspection
 * @param defaults Whether to use default values for prompts when possible
 * @param useSourceCredentialIdentifier Whether to use the source credential identifier, defined in the source object, as the default credentials
 */
export async function inspectSourceConnection(
    jobContext: JobContext,
    relatedPackage: PackageIdentifierInput | undefined,
    source: Source,
    credentialsConfiguration: undefined | DPMConfiguration,
    defaults: boolean | undefined,
    useSourceCredentialIdentifier: boolean | undefined
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

        await obtainConnectionConfiguration(
            jobContext,
            relatedPackage,
            connector,
            source.connectionConfiguration,
            undefined,
            defaults
        );

        jobContext.removeAnswerListener(promptAnswerListener);
    }

    const repositoryIdentifier = await connector.getRepositoryIdentifierFromConfiguration(
        source.connectionConfiguration
    );

    if ((defaults || useSourceCredentialIdentifier) && source.credentialsIdentifier) {
        try {
            credentialsConfiguration =
                (await jobContext.getRepositoryCredential(
                    relatedPackage,
                    connector.getType(),
                    repositoryIdentifier,
                    source.credentialsIdentifier
                )) ?? {};
        } catch (error) {
            jobContext.print("WARN", "The credential " + source.credentialsIdentifier + " could not be found or read.");
        }
    }

    if (credentialsConfiguration == null) credentialsConfiguration = {};

    const userCredentialsResponse = await obtainCredentialsConfiguration(
        jobContext,
        relatedPackage,
        connector,
        source.connectionConfiguration,
        credentialsConfiguration,
        false,
        undefined,
        defaults
    );

    if (userCredentialsResponse) {
        credentialsConfiguration = userCredentialsResponse.credentialsConfiguration;
    }

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

    jobContext.setCurrentStep(repositoryIdentifier + " Configuration and Streams");

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
        credentialsIdentifier:
            userCredentialsResponse !== false ? userCredentialsResponse.credentialsIdentifier : undefined,
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

    const streamContextTransform = new RecordStreamContextTransform(source, streamSetPreview, streamSummary);

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
                        if (deconflictedValue.skipRecord === true) {
                            shouldSkip = true;
                            break;
                        } else {
                            chunk.recordContext.record[title] = deconflictedValue.value;
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

export async function checkSchemaDataTypeConflicts(schema: Schema): Promise<Record<string, DPMPropertyTypes[]>> {
    const conflictedPropertyTypes: Record<string, DPMPropertyTypes[]> = {};
    Object.keys(schema.properties).forEach((title) => {
        const valueTypes = Object.keys(schema.properties[title].types).filter(
            (v) => v !== "null"
        ) as DPMPropertyTypes[];
        if (valueTypes.length > 1) {
            conflictedPropertyTypes[title] = valueTypes;
        }
    });

    for (const title of Object.keys(conflictedPropertyTypes)) {
        const valueTypes = conflictedPropertyTypes[title].sort();
        conflictedPropertyTypes[title] = valueTypes;
    }

    return conflictedPropertyTypes;
}

export function getDeconflictChoices(valueTypes: DPMPropertyTypes[]): ParameterOption[] {
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
            title: "Cast all values as numbers",
            value: DeconflictOptions.CAST_TO_DOUBLE
        },
        [DeconflictOptions.CAST_TO_DATE]: {
            title: "Cast all values as date (no time)",
            value: DeconflictOptions.CAST_TO_DATE
        },
        [DeconflictOptions.CAST_TO_DATE_TIME]: {
            title: "Cast all values as date timestamps",
            value: DeconflictOptions.CAST_TO_DATE_TIME
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
        // Date Time
        "date,date-time": [DeconflictOptions.CAST_TO_DATE_TIME, DeconflictOptions.CAST_TO_DATE, DeconflictOptions.ALL],
        "date-time,integer": [
            DeconflictOptions.CAST_TO_DATE_TIME,
            DeconflictOptions.CAST_TO_INTEGER,
            DeconflictOptions.ALL
        ],
        "date-time,number": [
            DeconflictOptions.CAST_TO_DATE_TIME,
            DeconflictOptions.CAST_TO_DOUBLE,
            DeconflictOptions.ALL
        ],

        "date-time,string": [
            DeconflictOptions.CAST_TO_DATE_TIME,
            DeconflictOptions.CAST_TO_STRING,
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
        ],
        "array,object": [DeconflictOptions.CAST_TO_STRING]
    };
    let promptChoices = [];
    if (valueTypes.length > 2) {
        promptChoices = [DeconflictOptions.CAST_TO_STRING, DeconflictOptions.ALL];
    } else {
        const valueTypeList = valueTypes.sort().join(",");
        promptChoices = deconflictOptions[valueTypeList];
    }
    if (promptChoices == null) throw new Error(`No deconflict options found for value types: ${valueTypes.join(",")}`);
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
        [DeconflictOptions.CAST_TO_DATE]: "date",
        [DeconflictOptions.CAST_TO_DATE_TIME]: "date-time",
        [DeconflictOptions.CAST_TO_STRING]: "string"
    };
    for (const title in deconflictOptions) {
        const property = Object.values(properties).find((p) => p.title === title);

        if (property == null) throw new Error("Could not find property with title: " + title);

        const deconflictOption = deconflictOptions[title];
        if (deconflictOption === DeconflictOptions.ALL) {
            continue;
        }

        if (deconflictOption === DeconflictOptions.SKIP || deconflictOption === DeconflictOptions.CAST_TO_NULL) {
            const nonStringPropertyTypes = Object.keys(property.types).filter(
                (t) => t !== "null" && t !== "string"
            ) as DPMPropertyTypes[];

            if (nonStringPropertyTypes.length === 0) {
                throw new Error("Could not find non-string property types for property with title: " + title);
            }

            if (nonStringPropertyTypes.length > 1) {
                throw new Error("Found multiple non-string property types for property with title: " + title);
            }

            const nonStringPropertyType = nonStringPropertyTypes[0];

            property.types = {
                [nonStringPropertyType]: Object(property.types)[nonStringPropertyType]
            };
        } else {
            const rule = deconflictRules[deconflictOption];

            if (rule == null) {
                throw new Error("Could not find rule for deconflict option: " + deconflictOption);
            }

            let preservedValueType: ValueTypeStatistics = Object(property.types)[rule];

            if (preservedValueType == null) {
                preservedValueType = {};
            }

            property.types = {
                [rule]: preservedValueType
            };
        }
    }
}

/**
 *
 * @param existingSchemas Formerly created Schemas
 * @param newSchemas Newly created Schemas
 * @returns
 */
export function combineSchemas(existingSchemas: Schema[], newSchemas: Schema[]): Schema[] {
    const returnValue: Schema[] = [];

    for (const existingSchema of existingSchemas) {
        const newSchema = newSchemas.find((s) => s.title === existingSchema.title);

        if (newSchema) {
            const combinedSchema = combineSchema(existingSchema, newSchema);

            returnValue.push(combinedSchema);
        } else {
            returnValue.push(existingSchema);
        }
    }

    for (const newSchema of newSchemas) {
        const existingSchema = returnValue.find((s) => s.title === newSchema.title);

        if (!existingSchema) {
            returnValue.push(newSchema);
        }
    }

    return returnValue;
}

export function combineSchema(existingSchema: Schema, newSchema: Schema): Schema {
    const properties = combineProperties(existingSchema.properties, newSchema.properties);

    // TODO Deep copy?
    return {
        title: existingSchema.title,
        properties,
        derivedFrom: lastThenFirst(existingSchema.derivedFrom, newSchema.derivedFrom),
        derivedFromDescription: lastThenFirst(existingSchema.derivedFromDescription, newSchema.derivedFromDescription),
        description: lastThenFirst(existingSchema.description, newSchema.description),
        hidden: existingSchema.hidden || newSchema.hidden,
        recordCountPrecision: newSchema.recordCountPrecision,
        recordCount: newSchema.recordCount,
        recordsInspectedCount: sumOrNull([existingSchema.recordsInspectedCount, newSchema.recordsInspectedCount]),
        recordsNotPresent: sumOrNull([existingSchema.recordsNotPresent, newSchema.recordsNotPresent]),
        sampleRecords: combineSampleRecords(existingSchema.sampleRecords, newSchema.sampleRecords),
        unit: lastThenFirst(existingSchema.unit, newSchema.unit)
    };
}

function combineSampleRecords(
    existingRecords: { [key: string]: unknown }[] | undefined,
    newRecords: { [key: string]: unknown }[] | undefined
) {
    if (existingRecords === undefined || newRecords === undefined) return lastThenFirst(existingRecords, newRecords);

    const returnValue: { [key: string]: unknown }[] = [];

    for (
        let i = 0;
        i < Math.max(existingRecords.length, newRecords.length) && returnValue.length < SAMPLE_RECORD_COUNT_MAX;
        i++
    ) {
        const existingRecord = existingRecords[i];
        const newRecord = newRecords[i];

        if (existingRecord) returnValue.push(existingRecord);

        if (newRecord) returnValue.push(newRecord);
    }

    return returnValue;
}

export function combineProperties(
    existingProperties: Properties | undefined,
    newProperties: Properties | undefined
): Properties {
    if (existingProperties === undefined || newProperties === undefined)
        return lastThenFirst(existingProperties, newProperties) || {};

    const properties: Properties = {};

    for (const key of Object.keys(existingProperties)) {
        const existingProperty = existingProperties[key];
        const newProperty = newProperties[key];

        if (newProperty) {
            const combinedProperty = combineProperty(existingProperty, newProperty);
            properties[key] = combinedProperty;
        } else {
            properties[key] = existingProperty;
        }
    }

    for (const key of Object.keys(newProperties)) {
        const existingProperty = properties[key];

        if (!existingProperty) {
            properties[key] = newProperties[key];
        }
    }

    return properties;
}

export function combineProperty(existingProperty: Property, newProperty: Property): Property {
    const combinedTypes = combineTypes(existingProperty.types, newProperty.types);

    return {
        title: existingProperty.title,
        types: combinedTypes,
        description: lastThenFirst(existingProperty.description, newProperty.description),
        hidden: existingProperty.hidden || newProperty.hidden,
        unit: lastThenFirst(existingProperty.unit, newProperty.unit),
        firstSeen: oldestOrEither(existingProperty.firstSeen, newProperty.firstSeen),
        lastSeen: newestOrEither(existingProperty.lastSeen, newProperty.lastSeen)
    };
}

export function combineTypes(existingTypes: ValueTypes | undefined, newTypes: ValueTypes | undefined): ValueTypes {
    if (existingTypes === undefined || newTypes === undefined) return lastThenFirst(existingTypes, newTypes) || {};

    const returnValue: ValueTypes = {};

    for (const [type, existingType] of Object.entries(existingTypes as ValueTypes)) {
        const newType = (newTypes as ValueTypes)[type as DPMPropertyTypes];

        if (newType) {
            const combinedType = combineValueTypesStatistics(existingType, newType);

            returnValue[type as DPMPropertyTypes] = combinedType;
        } else {
            returnValue[type as DPMPropertyTypes] = existingType;
        }
    }

    for (const [type, newType] of Object.entries(newTypes)) {
        const existingType = returnValue[type as DPMPropertyTypes];

        if (!existingType) {
            returnValue[type as DPMPropertyTypes] = newType;
        }
    }

    return returnValue;
}

export function combineValueTypesStatistics(
    existingType: ValueTypeStatistics | undefined,
    newType: ValueTypeStatistics | undefined
): ValueTypeStatistics | undefined {
    if (existingType === undefined && newType === undefined) return undefined;

    if (existingType !== undefined && newType === undefined) return existingType;

    if (existingType === undefined && newType !== undefined) return newType;

    const et = existingType as ValueTypeStatistics;
    const nt = newType as ValueTypeStatistics;

    const arrayMaxLength = maxOrNull([et.arrayMaxLength, nt.arrayMaxLength]);
    const arrayMinLength = minOrNull([et.arrayMinLength, nt.arrayMinLength]);
    const arrayTypes = combineTypes(et.arrayTypes, nt.arrayTypes);

    const booleanFalseCount = sumOrNull([et.booleanFalseCount, nt.booleanFalseCount]);
    const booleanTrueCount = sumOrNull([et.booleanTrueCount, nt.booleanTrueCount]);

    const contentLabels = combineContentLabels(et.contentLabels, nt.contentLabels);
    const dateMaxMillsecondsPrecision = maxOrNull([et.dateMaxMillsecondsPrecision, nt.dateMaxMillsecondsPrecision]);
    const dateMaxValue = dateMaxOrNull([et.dateMaxValue, nt.dateMaxValue]);
    const dateMinValue = dateMinOrNull([et.dateMinValue, nt.dateMinValue]);

    const numberMaxPrecision = maxOrNull([et.numberMaxPrecision, nt.numberMaxPrecision]);
    const numberMaxScale = maxOrNull([et.numberMaxScale, nt.numberMaxScale]);
    const numberMaxValue = maxOrNull([et.numberMaxValue, nt.numberMaxValue]);
    const numberMinValue = minOrNull([et.numberMinValue, nt.numberMinValue]);
    const recordCount = sumOrNull([et.recordCount, nt.recordCount]);
    const stringMaxLength = maxOrNull([et.stringMaxLength, nt.stringMaxLength]);
    const stringMinLength = minOrNull([et.stringMinLength, et.stringMinLength]);
    const stringOptions = combineStringOptions(et.stringOptions, nt.stringOptions);

    const objectProperties = combineProperties(et.objectProperties, nt.objectProperties);

    return {
        arrayMaxLength,
        arrayMinLength,
        arrayTypes,
        booleanFalseCount,
        booleanTrueCount,
        contentLabels,
        dateMaxMillsecondsPrecision,
        dateMaxValue,
        dateMinValue,
        numberMaxPrecision,
        numberMaxScale,
        numberMaxValue,
        numberMinValue,
        objectProperties,
        recordCount,
        stringMaxLength,
        stringMinLength,
        stringOptions
    };
}

function combineContentLabels(
    existingLabels: ContentLabel[] | undefined,
    newLabels: ContentLabel[] | undefined
): ContentLabel[] {
    const returnValue: ContentLabel[] = [];

    if (existingLabels) {
        for (const existingLabel of existingLabels) {
            const combinedLabel = combineContentLabel(
                existingLabel,
                newLabels?.find((l) => l.label === existingLabel.label)
            );

            returnValue.push(combinedLabel);
        }
    }

    if (newLabels) {
        for (const newLabel of newLabels) {
            if (!returnValue.find((l) => l.label === newLabel.label)) returnValue.push(newLabel);
        }
    }

    return returnValue;
}

function combineContentLabel(existingLabel: ContentLabel, newLabel: ContentLabel | undefined): ContentLabel {
    if (newLabel === undefined) {
        return existingLabel;
    }

    return {
        hidden: existingLabel.hidden || newLabel.hidden,
        label: existingLabel.label,
        appliedByContentDetector: lastThenFirst(
            existingLabel.appliedByContentDetector,
            newLabel.appliedByContentDetector
        ),
        ocurrenceCount: sumOrNull([existingLabel.ocurrenceCount, newLabel.ocurrenceCount]),
        valuesTestedCount: sumOrNull([existingLabel.valuesTestedCount, newLabel.valuesTestedCount])
    };
}

function combineStringOptions(
    existingOptions: { [key: string]: number } | undefined,
    newOptions: { [key: string]: number } | undefined
): { [key: string]: number } | undefined {
    if (existingOptions === undefined || newOptions === undefined) {
        return lastThenFirst(existingOptions, newOptions);
    }
    const returnValue: { [key: string]: number } = {};

    for (const option of Object.keys(existingOptions)) {
        const sum = sumOrNull([existingOptions[option], newOptions[option]]);

        if (sum !== undefined) returnValue[option] = sum;
    }

    for (const option of Object.keys(newOptions)) {
        if (returnValue[option] === undefined) returnValue[option] = newOptions[option];
    }

    return returnValue;
}

function oldestOrEither(a: Date | undefined, b: Date | undefined): Date | undefined {
    if (a === undefined && b === undefined) return undefined;

    if (a === undefined || b === undefined) return lastThenFirst(a, b);

    if (a.getTime() < b.getTime()) return a;

    return b;
}

function newestOrEither(a: Date | undefined, b: Date | undefined): Date | undefined {
    if (a === undefined && b === undefined) return undefined;

    if (a === undefined || b === undefined) return lastThenFirst(a, b);

    if (b.getTime() < a.getTime()) return a;

    return b;
}

function lastThenFirst<T>(a: T | undefined, b: T | undefined): T | undefined {
    if (a === undefined && b === undefined) return undefined;

    if (a === undefined && b !== undefined) return b;

    return a;
}

function sumOrNull(values: (number | undefined)[]): number | undefined {
    const numberValues = values.filter((v) => isNumber(v)) as number[];
    return numberValues.reduce((p, c) => c + p, 0);
}

function maxOrNull(values: (number | undefined)[]): number | undefined {
    const numberValues = values.filter((v) => isNumber(v)) as number[];

    if (numberValues.length === 0) return undefined;

    return Math.max(...numberValues);
}

function minOrNull(values: (number | undefined)[]): number | undefined {
    const numberValues = values.filter((v) => isNumber(v)) as number[];

    if (numberValues.length === 0) return undefined;

    return Math.min(...numberValues);
}

function dateMaxOrNull(values: (Date | undefined)[]): Date | undefined {
    const dateValues = values.filter((v) => v instanceof Date) as Date[];

    if (dateValues.length === 0) return undefined;

    return dateValues.reduce((p, c) => (p.getTime() > c.getTime() ? p : c), new Date(-8640000000000000));
}

function dateMinOrNull(values: (Date | undefined)[]): Date | undefined {
    const dateValues = values.filter((v) => v instanceof Date) as Date[];

    if (dateValues.length === 0) return undefined;

    return dateValues.reduce((p, c) => (p.getTime() > c.getTime() ? p : c), new Date(8640000000000000));
}

/** return false if the entire record should be skipped */
export function resolveConflict(
    value: DPMRecordValue,
    deconflictOption: DeconflictOptions
): { skipRecord: boolean; value: DPMRecordValue } {
    if (value === "null") return { skipRecord: false, value: null };
    if (value == null) return { skipRecord: false, value: null };

    if (deconflictOption === DeconflictOptions.ALL) return { skipRecord: false, value };
    const valueType = discoverValueType(value);
    const typeConvertedValue = convertValueByValueType(value, valueType);
    if (deconflictOption === DeconflictOptions.SKIP) {
        if (valueType !== "string") return { skipRecord: false, value };
        return { skipRecord: true, value };
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_NULL) {
        if (valueType !== "string") return { skipRecord: false, value };
        return { skipRecord: false, value: null };
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_BOOLEAN) {
        if (valueType === "boolean") return { skipRecord: false, value: typeConvertedValue };
        if (valueType === "number" || valueType === "integer")
            return { skipRecord: false, value: ((typeConvertedValue as number) > 0).toString() };
        if (valueType === "string") {
            const convertedValue = convertValueByValueType(value, "boolean");
            return { skipRecord: false, value: convertedValue };
        }
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_INTEGER) {
        if (valueType === "integer") return { skipRecord: false, value: typeConvertedValue };
        if (valueType === "number") return { skipRecord: false, value: Math.round(typeConvertedValue as number) };
        if (valueType === "boolean") return { skipRecord: false, value: typeConvertedValue ? "1" : "0" };
        if (valueType === "date") {
            return { skipRecord: false, value: (typeConvertedValue as Date).getTime().toString() };
        }
        if (valueType === "string") {
            const convertedValue = convertValueByValueType(value, "integer");
            return { skipRecord: false, value: convertedValue };
        }
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_DOUBLE) {
        if (valueType === "number") return { skipRecord: false, value };
        if (valueType === "boolean") return { skipRecord: false, value: typeConvertedValue ? "1.0" : "0.0" };
        if (valueType === "integer") return { skipRecord: false, value: `${typeConvertedValue}.0` };
        if (valueType === "string") {
            const convertedValue = convertValueByValueType(value, "number");
            return { skipRecord: false, value: convertedValue };
        }
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_DATE) {
        if (valueType === "date-time" || valueType === "date") return { skipRecord: false, value: typeConvertedValue };
        if (valueType === "integer")
            return {
                skipRecord: false,
                value: moment(new Date(typeConvertedValue as number))
                    .utc()
                    .toDate()
            };

        if (valueType === "string") {
            const stringTypeConveredValue: Date | null = convertValueByValueType(value, "date") as Date | null;

            if (stringTypeConveredValue == null) return { skipRecord: false, value: null };

            const momentValue = moment(stringTypeConveredValue as Date);

            if (!momentValue.isValid()) return { skipRecord: false, value: null };

            return { skipRecord: false, value: momentValue.utc().toDate() };
        }
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_DATE_TIME) {
        if (valueType === "date-time" || valueType === "date") return { skipRecord: false, value: typeConvertedValue };
        if (valueType === "integer")
            return {
                skipRecord: false,
                value: moment(new Date(typeConvertedValue as number))
                    .utc()
                    .toDate()
            };

        if (valueType === "string") {
            const stringTypeConveredValue: Date | null = convertValueByValueType(value, "date") as Date | null;

            if (stringTypeConveredValue == null) return { skipRecord: false, value: null };

            const momentValue = moment(stringTypeConveredValue as Date);

            if (!momentValue.isValid()) return { skipRecord: false, value: null };

            return { skipRecord: false, value: momentValue.utc().toDate() };
        }
    }
    if (deconflictOption === DeconflictOptions.CAST_TO_STRING) {
        if (valueType === "string") return { skipRecord: false, value };
        if (valueType === "null") return { skipRecord: false, value: null };
        if (valueType === "boolean") return { skipRecord: false, value: typeConvertedValue ? "true" : "false" };
        if (isDate(typeConvertedValue as string)) {
            return { skipRecord: false, value: (typeConvertedValue as Date).toISOString() };
        }
        if (valueType === "object") return { skipRecord: false, value: JSON.stringify(typeConvertedValue) };
        if (valueType === "array") return { skipRecord: false, value: JSON.stringify(typeConvertedValue) };
        return { skipRecord: false, value: value.toString() };
    }
    return { skipRecord: false, value: null };
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

        if (!schemaProperty.types) {
            throw new Error("This schema property has no value types, and therefore is not very useful");
        }

        const valueTypeSummaries = Object.keys(schemaProperty.types).map((key) => {
            const valueStats: ValueTypeStatistics = Object(schemaProperty.types)[key];
            if (valueStats.recordCount == null || schema.recordsInspectedCount == null) {
                return key;
            }
            if (schema.recordCount) {
                const percent = (valueStats.recordCount / schema.recordCount) * 100;
                return `${key}(${percent.toFixed(2)}%)`;
            } else {
                return `${key}`;
            }
        });

        jobContext.print(
            "NONE",
            `- ${chalk.yellow(propertyTitle)}\n    ${chalk.grey("Types: ")} ${valueTypeSummaries.join(", ")}`
        );

        const notHiddenLabels = Object.values(schemaProperty.types)
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

export function discoverValueType(value: DPMRecordValue): DPMPropertyTypes {
    if (value === null) return "null";

    const valueTypeOf = typeof value;

    if (valueTypeOf === "bigint") return "integer";

    if (valueTypeOf === "string") return "string";

    if (Array.isArray(value)) return "array";

    if (value instanceof Date) {
        if (
            value.getUTCHours() === 0 &&
            value.getUTCMinutes() === 0 &&
            value.getUTCSeconds() === 0 &&
            value.getUTCMilliseconds() === 0
        ) {
            return "date";
        }

        return "date-time";
    }

    if (valueTypeOf === "number") {
        const strValue = value.toString();
        if (strValue.indexOf(".") === -1) {
            return "integer";
        }
        return "number";
    }

    if (valueTypeOf === "undefined") {
        return "null";
    }

    if (valueTypeOf === "object") {
        return "object";
    }

    if (valueTypeOf === "boolean") {
        return "boolean";
    }

    throw new Error("Unable to detect type for value typof " + valueTypeOf);
}

export function discoverValueTypeFromString(value: string): DPMPropertyTypes {
    if (value === "null") return "null";

    if (value.trim() === "") return "null";

    const booleanValues = ["true", "false", "yes", "no"];

    if (booleanValues.includes(value.trim().toLowerCase())) return "boolean";

    if (isNumber(value.toString())) {
        const trimmedValue = value.trim();

        if (value === "0") return "integer";

        // Find doubles with no more than one preceding zero before a period
        if (trimmedValue.match(/^[-+]?(?:(?:[1-9][\d,]*)|0)\.\d+$/)) {
            return "number";

            // Find integers, no leading zeros, only three numbers between commas, no other characters, allows leading +/-
        } else if (trimmedValue.match(/^[-+]?(?![\D0])(?:\d+(?:(?<!\d{4}),(?=\d{3}(?:,|$)))?)+$|^0$/)) {
            return "integer";
        }
    }

    if (isDateTime(value)) {
        return "date-time";
    } else if (isDate(value)) {
        return "date";
    }

    return "string";
}

/** Given a value, convert it to a specific value type. Example: boolean from string */
export function convertValueByValueType(
    value: DPMRecordValue,
    valueType: DPMPropertyTypes
): DPMRecordValue | DPMRecordValue[] {
    if (value == null) return null;
    if (value === "null") return null;

    if (valueType === "null") {
        return null;
    } else if (valueType === "string") {
        if (typeof value === "string") return value;
        return value.toString();
    } else if (valueType === "boolean") {
        if (typeof value === "boolean") return value;
        if (typeof value === "number") return (value as number) > 0;
        if (typeof value === "string") {
            if (isNumber(value)) {
                return Number.parseInt(value) > 0;
            }
            const stringValue = (value as string).trim().toLowerCase();
            return stringValue === "true" || stringValue === "yes";
        }
    } else if (valueType === "number") {
        if (typeof value === "boolean") return (value as boolean) ? 1 : 0;
        if (typeof value === "number") return value;
        if (typeof value === "string") return +value;
    } else if (valueType === "integer") {
        if (typeof value === "boolean") return (value as boolean) ? 1 : 0;
        if (typeof value === "number") return Math.round(value);
        if (typeof value === "string") return Math.round(+value);
    } else if (valueType === "date") {
        if (value instanceof Date) return value;
        try {
            return createUTCDateTimeFromString(value as string); // TODO - this is probably not right for all situations
        } catch (err) {
            return value;
        }
    } else if (valueType === "date-time") {
        try {
            return createUTCDateTimeFromString(value as string); // TODO - this is probably not right for all situations
        } catch (err) {
            return value;
        }
    } else if (valueType === "object") {
        return value;
    } else if (valueType === "array") {
        return value;
    }

    // TODO recursively handle arrays and object
    throw new Error(`UNABLE_TO_CONVERT_TYPE ${typeof value} to ${valueType}"}`);
}
