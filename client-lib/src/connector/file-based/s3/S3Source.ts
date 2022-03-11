import { S3 } from "aws-sdk";
import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import fetch from "cross-fetch";
import mime from "mime-types";
import { FileStreamContext } from "../parser/Parser";
import { getAwsAuthenticationParameters, getStreamFromS3, getS3ObjectMetaData } from "../../../util/AwsUtil";
import { AbstractFileStreamSource } from "../AbstractFileStreamSource";
import { HTTPSource } from "../http/HTTPSource";
import { Source } from "../../Source";
import { TYPE } from "./S3ConnectorDescription";

export class S3Source extends AbstractFileStreamSource implements Source {
    sourceType(): string {
        return TYPE;
    }

    supportsURI(uri: string): boolean {
        return uri.startsWith("s3://");
    }

    getFileName(uri: string): string {
        const parts = uri.replace("s3://", "").split("/");
        return parts[parts.length - 1] || "";
    }

    parseUri(uri: string): Record<string, string> {
        const parts = uri.replace("s3://", "").split("/");
        const bucket = parts[0] || "";
        const key = parts.slice(1).join("/");
        return {
            bucket,
            key
        };
    }

    buildHttpUri(uri: string): string {
        const parsedUri = this.parseUri(uri);
        return `https://${parsedUri.bucket}.s3.amazonaws.com/${parsedUri.key}`;
    }

    async checkUriPublic(uri: string): Promise<boolean> {
        try {
            const result = await fetch(this.buildHttpUri(uri), {
                method: "HEAD"
            });
            return result.status === 200;
        } catch (error) {
            return false;
        }
    }

    async getInspectParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration
    ): Promise<Parameter[]> {
        if (connectionConfiguration.uris) {
            configuration.uris = connectionConfiguration.uris;
            delete connectionConfiguration.uris;
        }

        if (typeof configuration.uri === "string") {
            configuration.uris = [configuration.uri];
            delete configuration.uri;
        }

        let parameters: Parameter[] = [];

        if (
            configuration.addAnother === true ||
            configuration.uris == null ||
            (configuration.uris as string[]).length === 0
        ) {
            parameters = [
                {
                    configuration,
                    type: ParameterType.Text,
                    name: "uri",
                    message: "S3 File URI?",
                    stringRegExp: {
                        pattern: /^s3:\/\/\//,
                        message: "Must start with s3:///"
                    }
                },
                {
                    configuration,
                    type: ParameterType.Confirm,
                    message: "Add another file?",
                    name: "addAnother",
                    defaultValue: false
                }
            ];
        }

        delete configuration.addAnother;
        return parameters;

        const uris = configuration.uris as string[];

        for (const uri of uris) {
            if (!(await this.checkUriPublic(uri))) {
                return await getAwsAuthenticationParameters(configuration);
            }
        }
        return [];
    }

    async getFileStreams(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration?: DPMConfiguration
    ): Promise<FileStreamContext[]> {
        const uris = configuration?.uris as string[];

        // TODO - Support wildcard in paths, to read many files in single batch set
        // A wild card would indicate one set of files for a single stream

        const httpSource: HTTPSource = new HTTPSource();
        const httpUris: string[] = [];
        const s3Client = new S3();
        let sourceResponses: FileStreamContext[] = [];

        for (const uri of uris) {
            if (await this.checkUriPublic(uri)) {
                httpUris.push(this.buildHttpUri(uri));
            } else {
                const parsedUri = this.parseUri(uri);
                const metaData = await getS3ObjectMetaData(s3Client, parsedUri.bucket, parsedUri.key);
                if (!metaData) {
                    throw new Error("FILE_NOT_FOUND - " + uri);
                }
                const fileName = this.getFileName(uri);
                const mimeType = mime.lookup(fileName);

                const lastUpdatedHash = metaData.LastModified?.toISOString();
                const fileSize = metaData.ContentLength;

                const sourceResponse: FileStreamContext = {
                    openStream: async () => {
                        return {
                            stream: getStreamFromS3(s3Client, parsedUri.bucket, parsedUri.key),
                            fileName,
                            fileSize,
                            lastUpdatedHash,
                            reportedMimeType: mimeType || undefined
                        };
                    },
                    uri,
                    fileSize,
                    reportedMimeType: mimeType || undefined,
                    fileName,
                    lastUpdatedHash
                };

                sourceResponses.push(sourceResponse);
            }
        }
        if (httpUris.length) {
            const httpSourceResponses: FileStreamContext[] = await httpSource.getFileStreams(
                connectionConfiguration,
                credentialsConfiguration,
                { uris: httpUris }
            );
            sourceResponses = [...sourceResponses, ...httpSourceResponses];
        }

        return sourceResponses;
    }
}
