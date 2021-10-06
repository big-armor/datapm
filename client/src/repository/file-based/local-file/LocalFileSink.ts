import { SinkState, SinkStateKey, DPMConfiguration, PackageFile } from "datapm-lib";
import fs from "fs";
import os from "os";
import path from "path";
import { getRecordSerializer } from "../writer/RecordSerializerUtil";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { AbstractFileSink, RecordSerializedContext } from "../AbstractFileSink";
import { Writable, Readable, Transform } from "stream";
import { Maybe } from "../../../util/Maybe";
import { SinkSupportedStreamOptions } from "../../Sink";
import { UpdateMethod } from "../../Source";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { DPMRecordSerializer } from "../writer/RecordSerializer";
import { RecordSerializerCSVDescription } from "../writer/RecordSerializerCSVDescription";
import { DISPLAY_NAME, TYPE } from "./LocalFileRepositoryDescription";

export class LocalFileSink extends AbstractFileSink {
    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async getDefaultParameterValues(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): Promise<DPMConfiguration> {
        const serializerTransform = (await getRecordSerializer(
            (configuration.format as string) || new RecordSerializerCSVDescription().getOutputMimeType()
        )) as DPMRecordSerializer;

        const location = path.join(
            os.homedir(),
            "datapm",
            "data",
            catalogSlug !== undefined ? catalogSlug : "_no-catalog",
            packageFile.packageSlug,
            packageFile.version,
            serializerTransform.getFileExtension()
        );

        return {
            ...(await super.getDefaultParameterValues(catalogSlug, packageFile, configuration)),
            fileLocation: location,
            ...configuration
        };
    }

    /** Return a list of supported update methods, based on the configuration, schema, and current sink state */
    getSupportedStreamOptions(_configuration: DPMConfiguration, _sinkState: SinkState): SinkSupportedStreamOptions {
        return {
            updateMethods: [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG],
            streamSetProcessingMethods: [StreamSetProcessingMethod.PER_STREAM_SET, StreamSetProcessingMethod.PER_STREAM]
        };
    }

    async getFileSinkParameters(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): Promise<Parameter[]> {
        const defaultParameterValues: DPMConfiguration = await this.getDefaultParameterValues(
            catalogSlug,
            packageFile,
            configuration
        );

        if (configuration.fileLocation == null) {
            return [
                {
                    configuration,
                    type: ParameterType.Text,
                    name: "fileLocation",
                    defaultValue: defaultParameterValues.fileLocation as string,
                    message: "File Location?"
                }
            ];
        }

        return [];
    }

    async getWritableTransform(
        fileName: string,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod
    ): Promise<{ writingTransform: Transform; outputUrl: string }> {
        const outputUrl = configuration.fileLocation + `/${fileName}`;

        if (!fs.existsSync(configuration.fileLocation as string)) {
            fs.mkdirSync(configuration.fileLocation as string, { recursive: true });
        }

        let mode = "w";
        if (updateMethod === UpdateMethod.APPEND_ONLY_LOG) mode = "a";

        const fileHandle = fs.openSync(outputUrl, mode);

        const writingTransform = new Transform({
            objectMode: true,
            transform: (chunk: RecordSerializedContext, encoding, callback) => {
                fs.write(fileHandle, chunk.serializedValue, (error) => {
                    callback(error, chunk.originalRecord);
                });
            },
            final: (callback) => {
                fs.closeSync(fileHandle);
                callback();
            }
        });

        return { writingTransform, outputUrl };
    }

    async getSinkStateWritable(
        sinkStateKey: SinkStateKey,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Writable> {
        if (typeof configuration.fileLocation !== "string")
            throw new Error("fileLocation configuration must be a string");

        const dirname = configuration.fileLocation;

        if (!fs.existsSync(dirname)) {
            throw new Error("FileSink directory not present when saving sink state. This should not be possible!");
        }

        return fs.createWriteStream(
            path.join(
                dirname,
                `${sinkStateKey.catalogSlug}-${sinkStateKey.packageSlug}-${sinkStateKey.packageMajorVersion}-state.json`
            ),
            {
                flags: "w"
            }
        );
    }

    /** Return a list of supported update methods, based on the configuration, schema, and current sink state */
    getSupportedUpdateMethods(_configuration: DPMConfiguration, _sinkState: SinkState): UpdateMethod[] {
        return [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG];
    }

    async getSinkStateReadable(
        sinkStateKey: SinkStateKey,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Maybe<Readable>> {
        if (typeof configuration.fileLocation !== "string")
            throw new Error(
                "fileLocation configuration must be a string. It is a " + typeof configuration.fileLocation
            );

        const dirname = configuration.fileLocation;

        const stateFilePath = path.join(
            dirname,
            `${sinkStateKey.catalogSlug}-${sinkStateKey.packageSlug}-${sinkStateKey.packageMajorVersion}-state.json`
        );

        if (!fs.existsSync(stateFilePath)) return null;

        return fs.createReadStream(stateFilePath);
    }
}
