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
import { JobContext } from "../main";
import { convertValueByValueType, discoverValueType } from "../util/SchemaUtil";

const SAMPLE_RECORD_COUNT_MAX = 100;

export class StatsTransform extends Transform {
    recordCount = 0;
    recordsInspected = 0;
    schemas: Record<string, Schema>;
    contentLabelDetectorsBySchema: Record<string, ContentLabelDetector>;

    progressCallBack: (recordCount: number, recordsInspectedCount: number) => void;

    constructor(
        progressCallback: (recordCount: number, recordsInspectedCount: number) => void,
        schemas: Record<string, Schema>,
        opts?: TransformOptions
    ) {
        super(opts);
        this.schemas = schemas;
        this.progressCallBack = progressCallback;
        this.contentLabelDetectorsBySchema = {};
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

            const properties = schema.properties;

            const record = recordContext.record;

            if (this.contentLabelDetectorsBySchema[recordContext.schemaSlug] === undefined) {
                this.contentLabelDetectorsBySchema[recordContext.schemaSlug] = new ContentLabelDetector();
            }

            const contentLabelDetector = this.contentLabelDetectorsBySchema[recordContext.schemaSlug];

            const typeConvertedRecord: DPMRecord = inspectRecord(properties, record, contentLabelDetector);

            if (schema.sampleRecords == null) schema.sampleRecords = [];

            if (schema.sampleRecords.length < SAMPLE_RECORD_COUNT_MAX) schema.sampleRecords.push(typeConvertedRecord);

            this.recordsInspected++;
        }

        callback(null, recordContexts);
    }

    _final(callback: (error?: Error | null) => void): void {
        for (const schema of Object.values(this.schemas)) {
            const contentLabelDetector = this.contentLabelDetectorsBySchema[schema.title];
            contentLabelDetector.applyLabelsToProperties(schema.properties);
        }

        callback(null);
    }
}

/** Updates the valueType object provided with the attributes of the value provided */
function updateValueTypeStats(value: DPMRecordValue, valueType: DPMPropertyTypes, valueTypeStats: ValueTypeStatistics) {
    valueTypeStats.recordCount = (valueTypeStats.recordCount || 0) + 1;

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
        // TODO something upstream of this is converting date string values with longer
        // than three milliseconds to Date() objects - which do not support more than 3 milliseconds
        // precision. So this will never detect precision more than 3
        // Workaround seems to pass through both the raw value and the converted value?
        // but that could get complex quickly.
        const dateValue = value instanceof Date ? value : new Date(value.toString());

        if (dateValue instanceof Date && isFinite(dateValue.getTime())) {
            if (valueTypeStats.dateMaxValue == null || valueTypeStats.dateMaxValue?.getTime() < dateValue.getTime())
                valueTypeStats.dateMaxValue = dateValue;

            if (valueTypeStats.dateMinValue == null || valueTypeStats.dateMinValue.getTime() < dateValue.getTime())
                valueTypeStats.dateMinValue = dateValue;

            let millsecondsString = dateValue.getMilliseconds().toString();

            if (typeof value === "string") {
                const regex = /\d{2}:\d{2}:\d{2}\.(\d+)/g;
                const matches = regex.exec(value);
                if (matches != null && matches.length === 2) {
                    millsecondsString = matches[1];
                }
            }

            millsecondsString = millsecondsString.replace(/0+$/, "");
            const millseconds = Number.parseInt(millsecondsString);
            const millsecondsPrecision = millseconds > 0 ? millseconds.toString().length : 0;

            valueTypeStats.dateMaxMillsecondsPrecision = Math.max(
                valueTypeStats.dateMaxMillsecondsPrecision || 0,
                millsecondsPrecision
            );
        }
    } else if (valueType === "object") {
        // Nothing to do
    }

    if (valueTypeStats.stringOptions != null) {
        const valueString = value.toString() as string;

        if (valueType === "object") {
            delete valueTypeStats.stringOptions;
        } else if (valueString.length > 50) {
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

/** Recursively inspects the contents of objects and arrays. */
export function inspectRecord(
    properties: Record<string, Property>,
    record: DPMRecord,
    contentLabelDetector: ContentLabelDetector,
    interationDepth = 10 // TODO configurable?
): DPMRecord {
    if (interationDepth === 0) {
        return record;
    }

    const typeConvertedRecord: DPMRecord = {};

    Array.from(Object.keys(record)).forEach((title: string) => {
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        let property = properties![title];

        if (property == null) {
            const propertySchema: Property = {
                title,
                types: {}
            };
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            properties![title] = propertySchema;
            property = propertySchema;
        }

        const value = record[title];

        let valueType: DPMPropertyTypes = discoverValueType(value);
        let typeConvertedValue: DPMRecordValue;
        try {
            typeConvertedValue = convertValueByValueType(value, valueType);
        } catch (error) {
            const message = `Failed to convert value ${value} to type ${valueType}`;
            throw new Error(message);
        }

        typeConvertedRecord[title] = typeConvertedValue;

        let valueTypeStats = property.types[valueType];
        if (!valueTypeStats) {
            property.types[valueType] = valueTypeStats = {
                recordCount: 0,
                stringOptions: {}
            };
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
        } else if (valueType === "object") {
            if (property.properties == null) property.properties = {};
            const objectLabelDetector = contentLabelDetector.getObjectLabelDetector(title);
            typeConvertedRecord[title] = inspectRecord(
                property.properties,
                typeConvertedValue as DPMRecord,
                objectLabelDetector,
                interationDepth - 1
            );
        }

        updateValueTypeStats(typeConvertedValue, valueType as DPMPropertyTypes, valueTypeStats);

        contentLabelDetector.inspectValue(title, typeConvertedValue, valueType);
    });

    return typeConvertedRecord;
}
