import { RecordContext, DPMRecord, DPMRecordValue, Schema, ValueTypeStatistics, DPMPropertyTypes } from "datapm-lib";
import { Transform, TransformCallback, TransformOptions } from "stream";
import { ContentLabelDetector } from "../content-detector/ContentLabelDetector";
import { convertToJSONSchema7TypeName, convertValueByValueType, discoverValueType } from "../util/SchemaUtil";

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
