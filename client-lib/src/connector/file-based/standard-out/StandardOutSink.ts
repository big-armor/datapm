import {
    SinkState,
    SinkStateKey,
    DPMConfiguration,
    PackageFile,
    Schema,
    UpdateMethod,
    Parameter,
    ParameterType
} from "datapm-lib";
import fs from "fs";
import { getRecordSerializer, getRecordSerializers } from "../../../connector/file-based/writer/RecordSerializerUtil";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../../../connector/Sink";
import { RecordSerializerJSON } from "../../../connector/file-based/writer/RecordSerializerJSON";
import { Maybe } from "../../../util/Maybe";
import { Transform } from "stream";
import { RecordSerializedContext } from "../../../connector/file-based/AbstractFileSink";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { DISPLAY_NAME, TYPE } from "./StandardOutConnectorDescription";
import { JobContext } from "../../../main";

export class StandardOutSinkModule implements Sink {
    getSupportedStreamOptions(
        _configuration: DPMConfiguration,
        _sinkState: Maybe<SinkState>
    ): SinkSupportedStreamOptions {
        return {
            updateMethods: [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG], /// TODO - Should this be a configuration option chosen by the user?
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM_SET]
        };
    }

    async commitAfterWrites(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration,
        _configuration: DPMConfiguration,
        _commitKeys: CommitKey[],
        _sinkStateKey: SinkStateKey,
        _sinkState: SinkState
    ): Promise<void> {
        const stateFilePath = `${_sinkStateKey.catalogSlug}_${_sinkStateKey.packageSlug}_v${_sinkStateKey.packageMajorVersion}.datapm.state.json`;
        const sinkStateStr = JSON.stringify(_sinkState);
        fs.writeFileSync(stateFilePath, sinkStateStr);
    }

    async getSinkState(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration,
        _configuration: DPMConfiguration,
        _sinkStateKey: SinkStateKey
    ): Promise<Maybe<SinkState>> {
        const stateFilePath = `${_sinkStateKey.catalogSlug}_${_sinkStateKey.packageSlug}_v${_sinkStateKey.packageMajorVersion}.datapm.state.json`;

        if (!fs.existsSync(stateFilePath)) return null;

        const sinkStateStr = fs.readFileSync(stateFilePath);

        const sinkState = JSON.parse(sinkStateStr.toString());

        return sinkState;
    }

    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    isStronglyTyped(_configuration: DPMConfiguration): boolean {
        return false;
    }

    getDefaultParameterValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        _configuration: DPMConfiguration
    ): DPMConfiguration {
        return {
            format: new RecordSerializerJSON().getOutputMimeType()
        };
    }

    filterDefaultConfigValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        _configuration: Record<string, string | number | boolean | null>
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {}

    async getParameters(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<Parameter[]> {
        const defaultParameterValues: DPMConfiguration = this.getDefaultParameterValues(
            catalogSlug,
            packageFile,
            configuration
        );

        if (configuration.format == null) {
            return [
                {
                    configuration,
                    type: ParameterType.Select,
                    name: "format",
                    defaultValue: defaultParameterValues.format as string,
                    message: "File Format?",
                    options: getRecordSerializers()
                        .map((writer) => {
                            return { title: writer.getDisplayName(), value: writer.getOutputMimeType() };
                        })
                        .sort()
                }
            ];
        }

        return [];
    }

    async getWriteable(
        schema: Schema,
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod
    ): Promise<WritableWithContext> {
        if (typeof configuration.format !== "string") throw new Error("format configuration must be a string");

        const serializer = await getRecordSerializer(configuration.format);

        if (serializer == null) throw new Error("Writer for format " + configuration.format + " was not found!");

        const serializerTransforms = await serializer.getTransforms(schema, configuration, updateMethod);

        return {
            writable: new Transform({
                objectMode: true,
                transform: (chunk: RecordSerializedContext, _encoding, callback) => {
                    process.stdout.write(chunk.serializedValue, (error) => {
                        if (error != null) {
                            callback(error);
                            return;
                        }

                        callback(null, chunk.originalRecord);
                    });
                }
            }),
            transforms: serializerTransforms,
            outputLocation: "stdout",
            getCommitKeys: () => {
                return []; // Nothing to do
            }
        };
    }
}
