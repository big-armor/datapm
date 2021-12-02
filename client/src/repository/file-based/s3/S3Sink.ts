import { S3 } from "aws-sdk";
import { SinkState, SinkStateKey, DPMConfiguration, PackageFile, UpdateMethod } from "datapm-lib";
import fs from "fs";
import os from "os";
import path from "path";
import { Readable, Transform, Writable } from "stream";
import { Maybe } from "../../../util/Maybe";
import {
    createS3Bucket,
    getAwsAuthenticationParameters,
    getStreamFromS3,
    getS3BucketList,
    uploadToS3,
    getS3ObjectMetaData
} from "../../../util/AwsUtil";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { AbstractFileSink, RecordSerializedContext } from "../AbstractFileSink";
import { SinkSupportedStreamOptions } from "../../Sink";
import { getRecordSerializer } from "../writer/RecordSerializerUtil";
import { DPMRecordSerializer } from "../writer/RecordSerializer";
import { RecordSerializerCSVDescription } from "../writer/RecordSerializerCSVDescription";
import { TYPE, DISPLAY_NAME } from "./S3RepositoryDescription";

export class S3Sink extends AbstractFileSink {
    s3Client: S3;

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
            updateMethods: [UpdateMethod.BATCH_FULL_SET],
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

        configuration.fileLocation = defaultParameterValues.fileLocation;

        const parameters: Parameter[] = await getAwsAuthenticationParameters(configuration);
        if (parameters.length > 0) {
            return parameters;
        }

        this.s3Client = new S3();

        if (configuration.bucket == null) {
            const bucketList = await getS3BucketList(this.s3Client);
            if (bucketList.length > 0) {
                parameters.push({
                    configuration,
                    type: ParameterType.AutoComplete,
                    name: "bucket",
                    message: "S3 Bucket?",
                    options: bucketList.map((bucket) => ({
                        title: bucket,
                        value: bucket
                    }))
                });
            } else {
                parameters.push({
                    configuration,
                    type: ParameterType.Text,
                    name: "bucket",
                    message: "New S3 Bucket Name?"
                });
            }

            return parameters;
        }

        if (configuration.path == null) {
            await createS3Bucket(this.s3Client, configuration.region as string, configuration.bucket as string);

            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "path",
                message: "S3 Path?"
            });

            return parameters;
        }

        return [];
    }

    async getWritableTransform(
        fileName: string,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod
    ): Promise<{ writingTransform: Transform; outputUrl: string }> {
        const outputUrl = `${configuration.fileLocation}/${fileName}`;

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
            final: async (callback) => {
                fs.closeSync(fileHandle);
                const key = `${configuration.path}/${fileName}`;
                await uploadToS3(this.s3Client, outputUrl, configuration.bucket as string, key);
                fs.unlinkSync(outputUrl);
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

        if (!fs.existsSync(configuration.fileLocation)) {
            throw new Error("FileSink directory not present when saving sink state. This should not be possible!");
        }

        const stateFileName = `${sinkStateKey.catalogSlug}-${sinkStateKey.packageSlug}-${sinkStateKey.packageMajorVersion}-state.json`;
        const outputPath = `${configuration.fileLocation}/${stateFileName}`;

        const writable = fs.createWriteStream(outputPath, {
            flags: "w"
        });

        writable._final = async (callback) => {
            const key = `${configuration.path}/${stateFileName}`;
            await uploadToS3(this.s3Client, outputPath, configuration.bucket as string, key);
            fs.unlinkSync(outputPath);
            callback();
        };

        return writable;
    }

    async getSinkStateReadable(
        sinkStateKey: SinkStateKey,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Maybe<Readable>> {
        const stateFileName = `${sinkStateKey.catalogSlug}-${sinkStateKey.packageSlug}-${sinkStateKey.packageMajorVersion}-state.json`;
        const key = `${configuration.path}/${stateFileName}`;

        const metaData = await getS3ObjectMetaData(this.s3Client, configuration.bucket as string, key);

        return metaData ? getStreamFromS3(this.s3Client, configuration.bucket as string, key) : null;
    }
}
