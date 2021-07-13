import { DPMConfiguration, PackageFile, Schema } from "datapm-lib";
import { Readable, Transform, Writable } from "stream";
import { Maybe } from "../generated/graphql";
import { RecordStreamContext, UpdateMethod } from "../source/SourceUtil";
import { Parameter, ParameterType } from "../util/ParameterUtils";
import { Sink, SinkState, SinkStateKey, SinkSupportedStreamOptions, WritableWithContext } from "./SinkUtil";
import { RecordSerializerCSV } from "./writer/RecordSerializerCSV";
import { RecordSerializerJSON } from "./writer/RecordSerializerJSON";
import { DPMRecordSerializer, getRecordSerializer, getRecordSerializers } from "./writer/RecordSerializerUtil";

export abstract class AbstractFileSink implements Sink {
    abstract getType(): string;

    abstract getDisplayName(): string;

    abstract getWritableTransform(
        fileName: string,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod
    ): Promise<{ writingTransform: Transform; outputUrl: string }>;

    abstract getSinkStateWritable(sinkStateKey: SinkStateKey, configuration: DPMConfiguration): Promise<Writable>;

    abstract getSinkStateReadable(
        sinkStateKey: SinkStateKey,
        configuration: DPMConfiguration
    ): Promise<Maybe<Readable>>;

    async saveSinkState(
        configuration: DPMConfiguration,
        sinkStateKey: SinkStateKey,
        sinkState: SinkState
    ): Promise<void> {
        const sinkStateString = JSON.stringify(sinkState);

        const writableStream = await this.getSinkStateWritable(sinkStateKey, configuration);

        return new Promise((resolve, reject) => {
            writableStream.write(sinkStateString, () => {
                writableStream.end();
            });
            writableStream.on("finish", resolve);
            writableStream.on("error", reject);
        });
    }

    async getSinkState(configuration: DPMConfiguration, sinkStateKey: SinkStateKey): Promise<Maybe<SinkState>> {
        const stream = await this.getSinkStateReadable(sinkStateKey, configuration);

        if (stream == null) return null;

        const chunks = [];

        for await (const chunk of stream) {
            chunks.push(chunk);
        }

        const buffer = Buffer.concat(chunks);
        const sinkStateString = buffer.toString("utf-8");

        let sinkState = null;

        try {
            sinkState = JSON.parse(sinkStateString.toString());
        } catch (error) {
            // TODO - Warn the user with a context log?
        }

        return sinkState;
    }

    isStronglyTyped(configuration: DPMConfiguration): boolean {
        const serializerTransform = getRecordSerializer(
            (configuration.format as string) || new RecordSerializerJSON().getOutputMimeType()
        ) as DPMRecordSerializer;
        return serializerTransform.isStronglyTyped(configuration);
    }

    getDefaultParameterValues(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): DPMConfiguration {
        const serializerTransform = getRecordSerializer(
            (configuration.format as string) || new RecordSerializerCSV().getOutputMimeType()
        ) as DPMRecordSerializer;

        return {
            format: serializerTransform?.getOutputMimeType(),
            ...serializerTransform.getDefaultParameterValues(catalogSlug, packageFile, configuration),
            ...configuration
        };
    }

    abstract getFileSinkParameters(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): Promise<Parameter[]>;

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

        const fileSinkParameters = await this.getFileSinkParameters(catalogSlug, packageFile, configuration);

        if (fileSinkParameters.length > 0) return fileSinkParameters;

        // TODO pass back parameters from writer
        const serializerTransform = getRecordSerializer(
            (configuration.format as string) || new RecordSerializerJSON().getOutputMimeType()
        ) as DPMRecordSerializer;

        const serializerParameters = serializerTransform.getParameters(packageFile, configuration);

        if (serializerParameters.length > 0) return serializerParameters;

        return [];
    }

    /** Return a list of supported update methods, based on the configuration, schema, and current sink state */
    abstract getSupportedStreamOptions(
        _configuration: DPMConfiguration,
        _sinkState: SinkState
    ): SinkSupportedStreamOptions;

    async getWriteable(
        schema: Schema,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod
    ): Promise<WritableWithContext> {
        if (configuration.fileLocation == null) throw new Error("fileLocation configuration not specified");

        if (typeof configuration.fileLocation !== "string")
            throw new Error("fileLocation configuration must be a string");

        if (typeof configuration.format !== "string") throw new Error("format configuration must be a string");

        const serializerTransform = getRecordSerializer(configuration.format);

        if (serializerTransform == null)
            throw new Error(`Serializer for format ${configuration.format} was not found!`);

        const writableStreamResponse = await this.getWritableTransform(
            `${schema.title}.${serializerTransform?.getFileExtension()}`,
            configuration,
            updateMethod
        );

        const formatTransforms = await serializerTransform.getTransforms(schema, configuration, updateMethod);

        return {
            writable: writableStreamResponse.writingTransform,
            transforms: formatTransforms,
            outputLocation: writableStreamResponse.outputUrl
        };
    }

    filterDefaultConfigValues(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): void {
        const defaultValues = this.getDefaultParameterValues(catalogSlug, packageFile, configuration);

        if (configuration.fileLocation === defaultValues.fileLocation) delete configuration.fileLocation;
    }
}

/** A serialized chunk of data with a given offset. The entire value must be written to the stream before the
 * offset is considered done for the commit transaction
 */
export class RecordSerializedContext {
    originalRecord: RecordStreamContext | null;
    serializedValue: Buffer;
}
