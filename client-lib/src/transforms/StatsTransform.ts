import { RecordContext, DPMRecord, DPMRecordValue, Schema, ValueTypeStatistics } from "datapm-lib";
import { Transform, TransformCallback, TransformOptions } from "stream";
import { createUTCDateFromString, isDate, isTime } from "../util/DateUtil";
import { ExtendedJSONSchema7TypeName } from "../connector/Source";
import isNumber from "is-number";
import { JSONSchema7TypeName } from "json-schema";
import { ContentLabelDetector } from "../content-detector/ContentLabelDetector";
import { date } from "faker";
import { updateSchemaWithDeconflictOptions } from "../util/SchemaUtil";

const SAMPLE_RECORD_COUNT_MAX = 100;

export class StatsTransform extends Transform {
    recordCount = 0;
    recordsInspected = 0;
    schemas: Record<string, Schema>;
    contentLabelDetector: ContentLabelDetector;

    progressCallBack: (recordCount: number, recordsInspectedCount: number) => void;

    constructor(
        progressCallback: (recordCount: number, recordsInspectedCount: number) => void,
        schemas: Record<string, Schema>,
        contentLabelDetector: ContentLabelDetector,
        opts?: TransformOptions
    ) {
        super(opts);
        this.schemas = schemas;
        this.progressCallBack = progressCallback;
        this.contentLabelDetector = contentLabelDetector;
    }

    async _transform(
        recordContexts: RecordContext[],
        _encoding: BufferEncoding,
        callback: TransformCallback
    ): Promise<void> {
        this.recordCount += recordContexts.length;

        for (const recordContext of recordContexts) {
            if (!Object.keys(this.schemas).includes(recordContext.schemaSlug)) {
                this.schemas[recordContext.schemaSlug] = {
                    $schema: "http://json-schema.org/draft-07/schema",
                    type: "object",
                    title: recordContext.schemaSlug,
                    properties: {},
                    recordsInspectedCount: 0,
                    recordCount: 0,
                    sampleRecords: []
                };
            }

            const schema = this.schemas[recordContext.schemaSlug] as Schema;

            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            schema.recordCount!++;

            this.progressCallBack(this.recordCount, this.recordsInspected);

            const typeConvertedRecord: DPMRecord = {};

            Array.from(Object.keys(recordContext.record)).forEach((title: string) => {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                let property = schema.properties![title];

                if (property == null) {
                    const propertySchema: Schema = {
                        title,
                        recordCount: 0,
                        valueTypes: {}
                    };
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    schema.properties![title] = propertySchema;
                    property = propertySchema;
                }

                const value = recordContext.record[title];
                if (value === undefined) {
                    property.recordsNotPresent = (property.recordsNotPresent || 0) + 1;
                    return;
                }

                property.recordCount = (property.recordCount || 0) + 1;

                const valueType = discoverValueType(value);
                let typeConvertedValue: DPMRecordValue;
                try {
                    typeConvertedValue = convertValueByValueType(value, valueType);
                } catch (error) {
                    console.log(JSON.stringify(recordContext, null, 2));
                    throw error;
                }

                if (property.valueTypes == null) return;

                // If an integer is detected, and there exists
                // already numbers. Then count this as a number (and not an integer)
                if (valueType.type === "integer") {
                    if (property.valueTypes.number != null) {
                        valueType.format = "number";
                        valueType.type = "number";
                    }

                    // if a number is detected, and there exists
                    // already integers. Then convert those priort integer valueTypes
                    // to number.
                } else if (valueType.type === "number") {
                    if (property.valueTypes.integer != null) {
                        property.valueTypes.number = property.valueTypes.integer;
                        delete property.valueTypes.integer;
                        property.valueTypes.number.valueType = "number";
                    }
                }

                // Enumerate all value type format for sinks
                if (valueType.format) {
                    if (!property.format) {
                        property.format = valueType.format;
                    } else if (!property.format.split(",").includes(valueType.format)) {
                        property.format += `,${valueType.format}`;
                    }
                }

                typeConvertedRecord[title] = typeConvertedValue;

                let valueTypeStats = property.valueTypes[valueType.type];
                if (!valueTypeStats) {
                    property.valueTypes[valueType.type] = valueTypeStats = {
                        recordCount: 0,
                        valueType: convertToJSONSchema7TypeName(valueType.type),
                        stringOptions: {}
                    };
                }
                valueTypeStats.recordCount = (valueTypeStats.recordCount || 0) + 1;
                updateValueTypeStats(typeConvertedValue, valueTypeStats);

                this.contentLabelDetector.inspectValue(recordContext.schemaSlug, title, typeConvertedValue);
            });

            if (schema.sampleRecords == null) schema.sampleRecords = [];

            if (schema.sampleRecords.length < SAMPLE_RECORD_COUNT_MAX) schema.sampleRecords.push(typeConvertedRecord);

            this.recordsInspected++;
        }

        callback(null, recordContexts);
    }

    _final(callback: (error?: Error | null) => void): void {
        this.contentLabelDetector.applyLabelsToSchemas(Object.values(this.schemas));
        callback(null);
    }
}

function updateValueTypeStats(value: DPMRecordValue, valueTypeStats: ValueTypeStatistics) {
    if (valueTypeStats.valueType === "null") return;

    if (value == null) {
        return;
    }

    if (valueTypeStats.valueType === "string") {
        const stringValue = value as string;
        const valueLength = stringValue.length;

        if (valueTypeStats.stringMaxLength == null || valueTypeStats.stringMaxLength < valueLength)
            valueTypeStats.stringMaxLength = valueLength;

        if (valueTypeStats.stringMinLength == null || valueTypeStats.stringMinLength > valueLength)
            valueTypeStats.stringMinLength = valueLength;
    } else if (valueTypeStats.valueType === "number" || valueTypeStats.valueType === "integer") {
        let numberValue: number;

        if (typeof value === "number") numberValue = value as number;
        else if (typeof value === "string") {
            if (value.indexOf(".") !== -1) {
                numberValue = Number.parseFloat(value);
            } else {
                numberValue = Number.parseInt(value);
            }
        } else {
            return;
        }

        const valueString = value.toString();
        const parts = valueString.split(".");

        const precision = parts.reduce((sum, cur) => sum + cur.length, 0);
        const scale = parts.length === 2 ? parts[1].length : 0;

        if (valueTypeStats.numberMaxValue == null || valueTypeStats.numberMaxValue < numberValue)
            valueTypeStats.numberMaxValue = numberValue;

        if (valueTypeStats.numberMinValue == null || valueTypeStats.numberMinValue > numberValue)
            valueTypeStats.numberMinValue = numberValue;

        if (valueTypeStats.numberMaxPrecision == null || valueTypeStats.numberMaxPrecision < precision)
            valueTypeStats.numberMaxPrecision = precision;

        if (valueTypeStats.numberMaxScale == null || valueTypeStats.numberMaxScale < scale)
            valueTypeStats.numberMaxScale = scale;
    } else if (valueTypeStats.valueType === "boolean") {
        if (valueTypeStats.booleanTrueCount == null) valueTypeStats.booleanTrueCount = 0;
        if (valueTypeStats.booleanFalseCount == null) valueTypeStats.booleanFalseCount = 0;

        if (value === true) valueTypeStats.booleanTrueCount++;
        else if (value === false) valueTypeStats.booleanFalseCount++;
    } else if (valueTypeStats.valueType === "date") {
        const dateValue = new Date(value.toString()) as Date;

        if (dateValue instanceof Date && isFinite(dateValue.getTime())) {
            if (valueTypeStats.dateMaxValue == null || valueTypeStats.dateMaxValue?.getTime() < dateValue.getTime())
                valueTypeStats.dateMaxValue = dateValue;

            if (valueTypeStats.dateMinValue == null || valueTypeStats.dateMinValue.getTime() < dateValue.getTime())
                valueTypeStats.dateMinValue = dateValue;
        }
    }

    if (valueTypeStats.stringOptions != null) {
        const valueString = value.toString() as string;

        if (valueString.length > 50) {
            valueTypeStats.stringOptions = undefined;
        } else {
            if (valueTypeStats.stringOptions[valueString] == null) {
                valueTypeStats.stringOptions[valueString] = 0;
            }

            valueTypeStats.stringOptions[valueString]++;

            if (Object.keys(valueTypeStats.stringOptions).length > 50) delete valueTypeStats.stringOptions; // delete if there are too many options
        }
    }
}

export function discoverValueType(value: DPMRecordValue): { type: ExtendedJSONSchema7TypeName; format?: string } {
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

export function discoverValueTypeFromString(value: string): { type: ExtendedJSONSchema7TypeName; format?: string } {
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
        if (isTime(value)) {
            return { type: "date", format: "date-time" };
        }
        return { type: "date", format: "date" };
    }

    return { type: "string", format: "string" };
}

/** Given a value, convert it to a specific value type. Example: boolean from string */
export function convertValueByValueType(
    value: DPMRecordValue,
    valueType: { type: ExtendedJSONSchema7TypeName; format?: string } // TODO should this be DPMRecordValue??
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
            return createUTCDateFromString(value as string); // TODO - this is probably not right for all situations
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

export function convertToJSONSchema7TypeName(type: ExtendedJSONSchema7TypeName): JSONSchema7TypeName {
    return type.replace("binary", "boolean") as JSONSchema7TypeName;
}
