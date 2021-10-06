import {
    DPMConfiguration,
    PackageFile,
    packageFileSchemaToAvroSchema,
    Schema,
    SinkState,
    SinkStateKey
} from "datapm-lib";
import { Maybe } from "../../../util/Maybe";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { Sink, SinkSupportedStreamOptions, WritableWithContext } from "../../Sink";
import { RecordStreamContext, UpdateMethod } from "../../Source";
import { DISPLAY_NAME, TYPE } from "./DataPMRepositoryDescription";
import { Transform } from "stream";
import avro from "avsc";
import request = require("superagent");

export class DataPMSink implements Sink {
    isStronglyTyped(_configuration: DPMConfiguration): boolean | Promise<boolean> {
        return true;
    }

    getParameters(
        catalogSlug: string | undefined,
        schema: PackageFile,
        configuration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        if (configuration.catalogSlug == null) {
            return [
                {
                    type: ParameterType.Text,
                    message: "Catalog Slug?",
                    name: "catalogSlug",
                    configuration: configuration
                    // TODO implement options
                }
            ];
        }

        if (configuration.packageSlug == null) {
            return [
                {
                    type: ParameterType.Text,
                    message: "Package Slug?",
                    name: "packageSlug",
                    configuration: configuration
                }
            ];
        }

        // TODO should this just be version to make it easier?
        if (configuration.majorVersion == null) {
            return [
                {
                    type: ParameterType.Number,
                    message: "Major Version?",
                    name: "majorVersion",
                    configuration: configuration
                }
            ];
        }

        return [];
    }

    getSupportedStreamOptions(
        _configuration: DPMConfiguration,
        _sinkState: Maybe<SinkState>
    ): SinkSupportedStreamOptions {
        return {
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM],
            updateMethods: [UpdateMethod.APPEND_ONLY_LOG, UpdateMethod.APPEND_ONLY_LOG]
        };
    }

    async getWriteable(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod
    ): Promise<WritableWithContext> {
        const uri =
            `${connectionConfiguration.url}/data/${configuration.catalogSlug}/${configuration.packageSlug}/${configuration.majorVersion}/${schema.title}?updateMethod=` +
            updateMethod.toString();

        const req = request.post(uri);

        const avroSchema = packageFileSchemaToAvroSchema(schema);

        const avroEncoder = avro.Type.forSchema(avroSchema);

        return {
            outputLocation: uri,
            writable: new Transform({
                objectMode: true,
                transform: (record: RecordAndChunk, encoding, callback) => {
                    const value = req.write(record.serializedValue, encoding);
                    if (!value) callback(new Error("FAILED_TO_WRITE"));
                    else {
                        callback(null, record.originalRecord);
                    }
                },
                final: (callback) => {
                    req.end((err, res) => {
                        if (err == null) {
                            callback(err);
                        } else if (res.statusCode !== 200) {
                            callback(new Error("RESPONSE_STATUS_CODE_NOT_OK: " + res.statusCode));
                        }
                    });
                }
            }),
            transforms: [
                new Transform({
                    objectMode: true,
                    transform: (chunks: RecordStreamContext[], _encoding, callback) => {
                        const records: RecordAndChunk[] = chunks.map((chunk) => {
                            return {
                                serializedValue: avroEncoder.toBuffer(chunk.recordContext.record),
                                originalRecord: chunk
                            };
                        });

                        callback(null, records);
                    }
                })
            ]
        };
    }

    filterDefaultConfigValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        _configuration: DPMConfiguration
    ): void {
        // Nothing to do
    }

    async saveSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        sinkStateKey: SinkStateKey,
        sinkState: SinkState
    ): Promise<void> {
        const uri = `${connectionConfiguration.url}/data/${sinkStateKey.catalogSlug}/${sinkStateKey.packageSlug}/${sinkStateKey.packageMajorVersion}/state`;
        const res = await request.post(uri).attach("state", JSON.stringify(sinkState));
        if (res.statusCode !== 200) {
            throw new Error("RESPONSE_STATUS_CODE_NOT_OK: " + res.statusCode);
        }
    }

    async getSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        sinkStateKey: SinkStateKey
    ): Promise<Maybe<SinkState>> {
        const uri = `${connectionConfiguration.url}/data/${sinkStateKey.catalogSlug}/${sinkStateKey.packageSlug}/${sinkStateKey.packageMajorVersion}/state`;
        const response = await request.get(uri).accept("application/json").send();

        if (response.statusCode !== 200) {
            throw new Error("RESPONSE_NOT_OK: " + response.statusCode);
        }

        return response.body as SinkState;
    }

    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }
}

export class RecordAndChunk {
    originalRecord: RecordStreamContext | null;
    serializedValue: Buffer;
}
