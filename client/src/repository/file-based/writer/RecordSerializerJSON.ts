import { DPMConfiguration, PackageFile, Schema, UpdateMethod, RecordStreamContext } from "datapm-lib";
import { Transform, Writable } from "stream";
import { Parameter } from "../../../util/parameters/Parameter";
import { RecordSerializedContext } from "../AbstractFileSink";
import { DPMRecordSerializer } from "./RecordSerializer";
import { DISPLAY_NAME, EXTENSION, MIME_TYPE } from "./RecordSerializerJSONDescription";

export class RecordSerializerJSON implements DPMRecordSerializer {
    fileStream: Writable;
    schema: Schema;
    configuration: DPMConfiguration;

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    isStronglyTyped(_configuration: DPMConfiguration): boolean {
        return false;
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

    async getTransforms(
        schema: Schema,
        configuration: DPMConfiguration,
        _updateMethod: UpdateMethod
    ): Promise<Transform[]> {
        this.schema = schema;
        this.configuration = configuration;

        return [
            new Transform({
                objectMode: true,
                readableObjectMode: true,
                writableObjectMode: true,
                transform: function (records: RecordStreamContext[], encoding, callback) {
                    const buffers: Buffer[] = [];

                    for (const record of records) {
                        buffers.push(Buffer.from(JSON.stringify(record.recordContext.record) + "\n"));
                    }

                    const recordSerializedContext: RecordSerializedContext = {
                        originalRecord: records[records.length - 1],
                        serializedValue: Buffer.concat(buffers)
                    };

                    callback(null, recordSerializedContext);
                }
            })
        ];
    }
}
