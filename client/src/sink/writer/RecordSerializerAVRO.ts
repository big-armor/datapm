import avro from "avsc";
import { DPMConfiguration, PackageFile, Properties, Schema } from "datapm-lib";
import { JSONSchema7TypeName } from "json-schema";
import { Transform, TransformCallback, Writable } from "stream";
import { RecordStreamContext, UpdateMethod } from "../../source/Source";
import { convertValueByValueType } from "../../source/transforms/StatsTransform";
import { Parameter } from "../../util/parameters/Parameter";
import { RecordSerializedContext } from "../AbstractFileSink";
import { DPMRecordSerializer } from "./RecordSerializer";
import { DISPLAY_NAME, EXTENSION, MIME_TYPE } from "./RecordSerializerAVRODescription";

class BlockEncoder extends avro.streams.BlockEncoder {
    // eslint-disable-next-line
    _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback) {
        callback(null, chunk);
    }

    _flush(callback: TransformCallback) {
        callback();
    }
}

export class RecordSerializerAVRO implements DPMRecordSerializer {
    fileStream: Writable;
    schema: Schema;
    configuration: DPMConfiguration;

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    isStronglyTyped(_configuration: DPMConfiguration): boolean {
        return true;
    }

    getOutputMimeType(): string {
        return MIME_TYPE;
    }

    getFileExtension(): string {
        return EXTENSION;
    }

    getDefaultParameterValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        _configuration: DPMConfiguration
    ): DPMConfiguration {
        return {};
    }

    /** Return parameters interatively until no more questions are needed to be answered */
    getParameters(_packageFile: PackageFile, _configuration: DPMConfiguration): Parameter[] {
        return [];
    }

    sanitizeName(name: string): string {
        return name.replace(/[\s-/]/g, "_");
    }

    getAvroSchema(schema: Schema): avro.Type {
        return avro.Type.forSchema({
            name: this.sanitizeName(schema.title as string),
            type: "record",
            fields: Object.keys(schema.properties as Properties).map((field) => {
                const property = (schema.properties as Properties)[field];
                const propertyTypes = (property.type as JSONSchema7TypeName[]).filter((type) => type !== "null");
                let propertyType = propertyTypes[0] as string;
                if (propertyTypes.includes("number")) {
                    if (property.format?.includes("float")) propertyType = "float";
                    else propertyType = "int";
                }
                return {
                    name: this.sanitizeName(field),
                    type: propertyType
                };
            })
        });
    }

    async getTransforms(
        schema: Schema,
        configuration: DPMConfiguration,
        _updateMethod: UpdateMethod
    ): Promise<Transform[]> {
        // eslint-disable-next-line
        const self = this;
        this.schema = schema;
        this.configuration = configuration;
        const avroSchema = this.getAvroSchema(schema);

        return [
            new Transform({
                objectMode: true,
                transform(records: RecordStreamContext[], _encoding, callback) {
                    for (const record of records) {
                        const recordData = record.recordContext.record;
                        Object.keys(recordData).forEach((key) => {
                            const validKey = self.sanitizeName(key);
                            recordData[validKey] = recordData[key];
                            if (validKey !== key) {
                                delete recordData[key];
                            }

                            const property = (schema.properties as Properties)[key];
                            const types = (property.type as JSONSchema7TypeName[]).filter((type) => type !== "null");
                            const formats = (property.format || "").split(",").filter((type) => type !== "null");
                            const valueType = {
                                type: types[0],
                                format: formats[0]
                            };
                            recordData[validKey] = convertValueByValueType(recordData[validKey], valueType);
                            if (recordData[validKey] === null) {
                                if (valueType.type === "string") {
                                    recordData[validKey] = "";
                                } else if (valueType.type === "number") {
                                    recordData[validKey] = 0;
                                }
                            }
                        });
                        this.push(recordData);
                    }
                    callback(null);
                }
            }),
            new BlockEncoder(avroSchema),
            new Transform({
                objectMode: true,
                transform(chunk, _encoding, callback) {
                    const recordSerializedContext: RecordSerializedContext = {
                        originalRecord: null,
                        serializedValue: chunk
                    };

                    callback(null, recordSerializedContext);
                }
            })
        ];
    }
}
