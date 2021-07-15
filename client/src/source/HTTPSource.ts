import { DPMConfiguration } from "datapm-lib";
import http, { IncomingMessage } from "http";
import https from "https";
import { FileOpenStreamContext, FileStreamContext } from "../parser/Parser";
import { Parameter, ParameterType } from "../util/parameters/Parameter";
import { AbstractFileStreamSource } from "./AbstractFileStreamSource";
import { TYPE } from "./HTTPSourceDescription";

export class HTTPSource extends AbstractFileStreamSource {
    sourceType(): string {
        return TYPE;
    }

    removeSecretConfigValues(
        _configuration: DPMConfiguration
        // eslint-disable-next-line @typescript-eslint/no-empty-function
    ): void {}

    async getInspectParameters(configuration: DPMConfiguration): Promise<Parameter[]> {
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
                    message: "URL of file?",
                    validate: (value: string | number | boolean) => {
                        if (value == null || (value as string).length === 0) {
                            return "URL required";
                        }

                        const strValue = value as string;

                        if (!strValue.startsWith("http://") && !strValue.startsWith("https://")) {
                            return "Must start with http:// or https://";
                        }

                        return true;
                    }
                },
                {
                    configuration,
                    type: ParameterType.Confirm,
                    message: "Add another file?",
                    name: "addAnother"
                }
            ];
        }

        delete configuration.addAnother;
        return parameters;
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getClient(url: string): any {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let client: any = http;

        if (url.startsWith("https://")) client = https;

        client.followAllRedirects = true;

        return client;
    }

    getFileName(url: string, response?: IncomingMessage): string {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;

        let fileName: string | null = null;

        if (response?.headers["content-disposition"]) {
            const disposition = response.headers["content-disposition"];
            const matches = filenameRegex.exec(disposition);
            if (matches != null && matches[1]) fileName = matches[1].replace(/['"]/g, "");
        }

        if (!fileName) {
            // TODO support URLs with query parameters, etc

            // Use the last part of the path
            const urlParts = url.split("/");

            fileName = urlParts[url.endsWith("/") ? urlParts.length - 2 : urlParts.length - 1];
            fileName = fileName.split("?")[0];
        }

        return fileName;
    }

    async getFileStreams(configuration?: DPMConfiguration, _startHash?: string): Promise<FileStreamContext[]> {
        if (configuration?.uris == null) {
            throw new Error("HTTPSource requires uris configuration object");
        }

        const uris: string[] = configuration?.uris as string[];

        return Promise.all(
            uris.map<Promise<FileStreamContext>>((uri) => {
                return new Promise<FileStreamContext>((resolve) => {
                    const fileName = this.getFileName(uri as string);

                    this.getClient(uri)
                        .request(uri, { method: "HEAD" }, (response: IncomingMessage) => {
                            const lastUpdatedHash = response.headers["last-modified"];

                            const fileStreamContext: FileStreamContext = {
                                fileName,
                                uri,
                                lastUpdatedHash,
                                openStream: () => {
                                    return new Promise((resolve, reject) => {
                                        const request = this.getClient(uri).get(uri, (response: IncomingMessage) => {
                                            const fileName = this.getFileName(uri as string, response);

                                            let expectedBytes = 0;

                                            if (response.headers["content-length"])
                                                expectedBytes = Number.parseInt(response.headers["content-length"]);

                                            const mimeType = response.headers["content-type"];

                                            let lastUpdatedHash = new Date().toISOString();

                                            if (typeof response.headers.etag === "string")
                                                lastUpdatedHash = response.headers.etag;

                                            const sourceResponse: FileOpenStreamContext = {
                                                stream: response,
                                                fileName,
                                                fileSize: expectedBytes,
                                                reportedMimeType: mimeType,
                                                lastUpdatedHash
                                            };
                                            resolve(sourceResponse);
                                        });

                                        request.on("error", (error: Error) => {
                                            reject(error);
                                        });
                                    });
                                }
                            };

                            resolve(fileStreamContext);
                        })
                        .end();
                });
            })
        );
    }
}
