import {
    RecordContext,
    DPMRecord,
    DPMRecordValue,
    Schema,
    ValueTypeStatistics,
    DPMPropertyTypes,
    Property
} from "datapm-lib";
import { Transform, TransformCallback, TransformOptions } from "stream";
import { ContentLabelDetector } from "../content-detector/ContentLabelDetector";
import { convertValueByValueType, discoverValueType } from "../util/SchemaUtil";

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
                    const propertySchema: Property = {
                        title,
                        types: {}
                    };
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    schema.properties![title] = propertySchema;
                    property = propertySchema;
                }

                const value = recordContext.record[title];

                let valueType: DPMPropertyTypes = discoverValueType(value);
                let typeConvertedValue: DPMRecordValue;
                try {
                    typeConvertedValue = convertValueByValueType(value, valueType);
                } catch (error) {
                    console.log(JSON.stringify(recordContext, null, 2));
                    throw error;
                }

                if (property.types == null) return;

                // If an integer is detected, and there exists
                // already numbers. Then count this as a number (and not an integer)
                if (valueType === "integer") {
                    if (property.types.number != null) {
                        valueType = "number" as DPMPropertyTypes;
                    }

                    // if a number is detected, and there exists
                    // already integers. Then convert those prior integer valueTypes
                    // to number.
                } else if (valueType === "number") {
                    if (property.types.integer != null) {
                        property.types.number = property.types.integer;
                        delete property.types.integer;
                    }
                }

                typeConvertedRecord[title] = typeConvertedValue;

                let valueTypeStats = property.types[valueType];
                if (!valueTypeStats) {
                    property.types[valueType] = valueTypeStats = {
                        recordCount: 0,
                        stringOptions: {}
                    };
                }
                valueTypeStats.recordCount = (valueTypeStats.recordCount || 0) + 1;
                updateValueTypeStats(typeConvertedValue, valueType as DPMPropertyTypes, valueTypeStats);

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

function updateValueTypeStats(value: DPMRecordValue, valueType: DPMPropertyTypes, valueTypeStats: ValueTypeStatistics) {
    if (valueType === "null") {
        valueTypeStats.recordCount = (valueTypeStats.recordCount || 0) + 1;
    }

    if (value == null) {
        return;
    }

    if (valueType === "string") {
        const stringValue = value as string;
        const valueLength = stringValue.length;

        if (valueTypeStats.stringMaxLength == null || valueTypeStats.stringMaxLength < valueLength)
            valueTypeStats.stringMaxLength = valueLength;

        if (valueTypeStats.stringMinLength == null || valueTypeStats.stringMinLength > valueLength)
            valueTypeStats.stringMinLength = valueLength;
    } else if (valueType === "number" || valueType === "integer") {
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
    } else if (valueType === "boolean") {
        if (valueTypeStats.booleanTrueCount == null) valueTypeStats.booleanTrueCount = 0;
        if (valueTypeStats.booleanFalseCount == null) valueTypeStats.booleanFalseCount = 0;

        if (value === true) valueTypeStats.booleanTrueCount++;
        else if (value === false) valueTypeStats.booleanFalseCount++;
    } else if (valueType === "date" || valueType === "date-time") {
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
