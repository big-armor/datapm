import { DATAPM_VERSION, DPMConfiguration, Parameter } from "datapm-lib";
import http, { IncomingMessage } from "http";
import https from "https";
import { FileOpenStreamContext, FileStreamContext } from "../parser/Parser";
import { AbstractFileStreamSource } from "../AbstractFileStreamSource";
import { TYPE, DISPLAY_NAME } from "./HTTPConnectorDescription";
import { fileNameFromUrl } from "../../../util/NameUtil";

export class HTTPSource extends AbstractFileStreamSource {
    sourceType(): string {
        return TYPE;
    }

    /** The user friendly name of the source implementation */
    getDisplayName(): string {
        return DISPLAY_NAME;
    }

    async getInspectParameters(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration,
        _configuration: DPMConfiguration
    ): Promise<Parameter[]> {
        return [];
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    getClient(url: string): typeof http {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let client: any = http;

        if (url.startsWith("https://")) client = https;

        client.followAllRedirects = true;

        return client;
    }

    async getFileStreams(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration?: DPMConfiguration,
        _startHash?: string
    ): Promise<FileStreamContext[]> {
        if (connectionConfiguration?.uris == null) {
            throw new Error("HTTPSource requires uris configuration object");
        }

        const uris: string[] = connectionConfiguration?.uris as string[];

        return Promise.all(
            uris.map<Promise<FileStreamContext>>((uri) => {
                return new Promise<FileStreamContext>((resolve) => {
                    const fileName = fileNameFromUrl(uri as string);

                    this.getClient(uri)
                        .request(
                            uri,
                            {
                                method: "HEAD",
                                agent: false,
                                headers: {
                                    // "User-Agent":
                                    //    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/77.0.3865.90 Safari/537.36"
                                    "User-Agent": `DataPM/${DATAPM_VERSION}`
                                }
                            },
                            (response: IncomingMessage) => {
                                const lastUpdatedHash = response.headers["last-modified"];

                                const fileStreamContext: FileStreamContext = {
                                    fileName,
                                    uri,
                                    lastUpdatedHash,
                                    openStream: () => {
                                        return new Promise((resolve, reject) => {
                                            const request = this.getClient(uri).get(
                                                uri,
                                                {
                                                    agent: false,
                                                    headers: {
                                                        "User-Agent": `DataPM/${DATAPM_VERSION}`
                                                    }
                                                },
                                                (response: IncomingMessage) => {
                                                    const fileName = fileNameFromUrl(uri as string, response);

                                                    let expectedBytes = 0;

                                                    if (response.headers["content-length"])
                                                        expectedBytes = Number.parseInt(
                                                            response.headers["content-length"]
                                                        );

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
                                                }
                                            );

                                            request.on("error", (error: Error) => {
                                                reject(error);
                                            });
                                        });
                                    }
                                };

                                resolve(fileStreamContext);
                            }
                        )
                        .end();
                });
            })
        );
    }
}
