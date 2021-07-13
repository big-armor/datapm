import { DPMConfiguration, PackageFile, Schema } from "datapm-lib";
import { Transform, Writable } from "stream";
import { RecordStreamContext, UpdateMethod } from "../../source/SourceUtil";
import { Parameter } from "../../util/parameters/Parameter";
import { RecordSerializedContext } from "../AbstractFileSink";
import { DPMRecordSerializer } from "./RecordSerializerUtil";

export class RecordSerializerJSON implements DPMRecordSerializer {
    fileStream: Writable;
    schema: Schema;
    configuration: DPMConfiguration;

    getDisplayName(): string {
        return "JSON (JavaScript Object Notation)";
    }

    isStronglyTyped(_configuration: DPMConfiguration): boolean {
        return false;
    }

    getOutputMimeType(): string {
        return "application/json";
    }

    getFileExtension(): string {
        return "json";
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
