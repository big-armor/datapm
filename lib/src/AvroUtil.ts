import avro from "avsc";
import { TransformCallback } from "stream";
import { encodeBase62 } from "./Base62Util";
import { Schema } from "./main";

export const DPM_AVRO_DOC_URL_V1 = "https://datapm.io/docs/registry/data-repository/avro/v1";

export function packageFileSchemaToAvroSchema(schema: Schema): avro.schema.RecordType {
    if (schema.title == null) throw new Error("SCHEMA_HAS_NO_TITLE");

    return {
        type: "record",
        name: schema.title,
        doc: DPM_AVRO_DOC_URL_V1,
        fields: Object.values(schema.properties || {})
            .flatMap((value) => {
                if (Array.isArray(value.type)) {
                    return value.type.flatMap((type) => {
                        if (type === "number") {
                            const formats = value.format?.split(",") || [];

                            return formats
                                .filter((f) => ["integer", "number"].includes(f))
                                .map((f) => {
                                    return {
                                        type: f,
                                        property: value
                                    };
                                });
                        }

                        return {
                            type,
                            property: value
                        };
                    });
                }

                if (value.type == null) throw new Error("VALUE_HAS_NO_TYPE");

                return {
                    type: value.type,
                    property: value
                };
            })
            .map((value) => {
                if (!value.property.title) {
                    throw new Error("PROPERTY_HAS_NO_TITLE");
                }

                return {
                    name: toAvroPropertyName(value.property.title, value.type),
                    type: packageFileTypeToAvroType(value.type)
                };
            })
    };
}

export function toAvroPropertyName(propertyTitle: string, type: string): string {
    const base62value = encodeBase62(propertyTitle);
    return base62value + "_" + type;
}

export function packageFileTypeToAvroType(packageFileType: string | string[]): string {
    switch (packageFileType) {
        case "string":
            return "string";
        case "integer":
            return "int";
        case "number":
            return "double";
        case "boolean":
            return "boolean";
        case "array":
            return "array";
        case "object":
            return "record";
        default:
            throw new Error("Unknown type: " + packageFileType);
    }
}

export class AvroBlockDecoder extends avro.streams.BlockDecoder {
    // eslint-disable-next-line
    _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback) {
        callback(null, chunk);
    }

    _flush(callback: TransformCallback): void {
        callback();
    }
}

export class AvroBlockEncoder extends avro.streams.BlockEncoder {
    // eslint-disable-next-line
    _transform(chunk: any, _encoding: BufferEncoding, callback: TransformCallback) {
        callback(null, chunk);
    }

    _flush(callback: TransformCallback): void {
        callback();
    }
}
