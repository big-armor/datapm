import { DPMConfiguration, PackageFile, Schema } from "datapm-lib";
import fs from "fs";
import { getRecordSerializer, getRecordSerializers } from "./writer/RecordSerializerUtil";
import { Sink, SinkState, SinkStateKey, SinkSupportedStreamOptions, WritableWithContext } from "./Sink";
import { Parameter, ParameterType } from "../util/parameters/Parameter";
import { RecordSerializerJSON } from "./writer/RecordSerializerJSON";
import { Maybe } from "../util/Maybe";
import { Transform } from "stream";
import { UpdateMethod } from "../source/Source";
import { RecordSerializedContext } from "./AbstractFileSink";
import { StreamSetProcessingMethod } from "../util/StreamToSinkUtil";
import { DISPLAY_NAME, TYPE } from "./StandardOutSink";

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

    async saveSinkState(
        _configuration: DPMConfiguration,
        _sinkStateKey: SinkStateKey,
        _sinkState: SinkState
    ): Promise<void> {
        const stateFilePath = `${_sinkStateKey.catalogSlug}_${_sinkStateKey.packageSlug}_v${_sinkStateKey.packageMajorVersion}.datapm.state.json`;
        const sinkStateStr = JSON.stringify(_sinkState);
        fs.writeFileSync(stateFilePath, sinkStateStr);
    }

    async getSinkState(configuration: DPMConfiguration, _sinkStateKey: SinkStateKey): Promise<Maybe<SinkState>> {
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
        catalogSlug: string | undefined,
        packageFile: PackageFile,
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
        configuration: DPMConfiguration
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
                    options: getRecordSerializers().map((writer) => {
                        return { title: writer.getDisplayName(), value: writer.getOutputMimeType() };
                    })
                }
            ];
        }

        return [];
    }

    async getWriteable(
        schema: Schema,
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
                transform: (chunk: RecordSerializedContext, encoding, callback) => {
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
            outputLocation: "stdout"
        };
    }
}
