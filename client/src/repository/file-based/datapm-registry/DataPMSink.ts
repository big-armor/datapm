import {
    TimeoutPromise,
    DPMConfiguration,
    PackageFile,
    Schema,
    SinkState,
    SinkStateKey,
    SocketEvent,
    UpdateMethod,
    SocketResponseType,
    StreamIdentifier,
    UploadRequest,
    UploadRequestType,
    UploadResponse,
    ErrorResponse,
    UploadDataRequest,
    StartUploadRequest,
    StartUploadResponse,
    UploadStopRequest,
    UploadStopResponse,
    BatchIdentifier,
    SetStreamActiveBatchesRequest,
    SetStreamActiveBatchesResponse
} from "datapm-lib";
import { Maybe } from "../../../util/Maybe";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../../Sink";
import { DISPLAY_NAME, TYPE } from "./DataPMRepositoryDescription";
import { Transform } from "stream";
import { io, Socket } from "socket.io-client";
import { getRegistryConfig } from "../../../util/ConfigUtil";
import { PausingTransform } from "../../../transforms/PauseableTransform";
import { RecordStreamContext } from "../../Source";

export class DataPMSink implements Sink {
    isStronglyTyped(_configuration: DPMConfiguration): boolean | Promise<boolean> {
        return false;
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
            updateMethods: [UpdateMethod.BATCH_FULL_SET, UpdateMethod.APPEND_ONLY_LOG]
        };
    }

    async getWriteable(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        _updateMethod: UpdateMethod
    ): Promise<WritableWithContext> {
        if (typeof connectionConfiguration.url !== "string") {
            throw new Error("MISSING_CONNECITON_CONFIG_VALUE: url");
        }

        const streamIdentifier: StreamIdentifier = {
            registryUrl: connectionConfiguration.url,
            catalogSlug: configuration.catalogSlug as string,
            packageSlug: configuration.packageSlug as string,
            majorVersion: configuration.majorVersion as number,
            schemaTitle: schema.title as string,
            streamSlug: schema.title as string // TODO should this be the user's name? So that it could be removed by user?
        };

        const socket = this.connectSocket(connectionConfiguration, credentialsConfiguration);

        const uploadRequest = new StartUploadRequest(streamIdentifier, true); // TODO support appending

        let uploadChannelName = "not-set";

        const pausingTransform = new PausingTransform(true, {
            objectMode: true
        });

        let lastOffset = 0;
        const writableTransform = new Transform({
            objectMode: true,
            transform: async (records: RecordStreamContext[], encoding, callback) => {
                socket.emit(
                    uploadChannelName,
                    new UploadDataRequest(
                        records.map((r) => {
                            lastOffset = r.recordContext.offset !== undefined ? r.recordContext.offset : lastOffset + 1;
                            return {
                                offset: lastOffset,
                                record: r.recordContext.record
                            };
                        })
                    ),
                    (_response: StartUploadResponse) => {
                        callback(null, records[records.length - 1]); // TODO have the server emit last committed offset and use that here
                    }
                );
            },
            final: async (callback) => {
                console.log("Final called on DataPMSink \n\n");
                try {
                    await new TimeoutPromise<void>(5000, (resolve) => {
                        socket.emit(uploadChannelName, new UploadStopRequest(), (_response: UploadStopResponse) => {
                            console.log("Received response \n\n");

                            resolve();
                        });
                    });
                } catch (error) {
                    // TODO get a context to log an error
                    console.log("error: " + JSON.stringify(error));
                } finally {
                    if (socket.connected) {
                        socket.close();
                    }
                    callback();
                }
            }
        });

        socket.onAny((_event: SocketEvent) => {
            // console.log("Socket event", event);
        });

        let batchIdentifier: BatchIdentifier;

        await new TimeoutPromise<void>(5000, (resolve) => {
            socket.once("connect", async () => {
                socket.once(SocketEvent.READY.toString(), () => {
                    socket.emit(
                        SocketEvent.START_DATA_UPLOAD.toString(),
                        uploadRequest,
                        (response: StartUploadResponse | ErrorResponse) => {
                            if (response.responseType === SocketResponseType.START_DATA_UPLOAD_RESPONSE) {
                                uploadChannelName = (response as StartUploadResponse).channelName;
                                batchIdentifier = (response as StartUploadResponse).batchIdentifier;
                                pausingTransform.actuallyResume();
                                resolve();
                            } else if (response.responseType === SocketResponseType.ERROR) {
                                const responseError = response as ErrorResponse;
                                throw new Error(responseError.message);
                            }
                        }
                    );
                });
            });
        });

        socket.on("connect_error", (error: unknown) => {
            console.log("connect_error", error);
            // TODO Handle error
        });

        socket.once("disconnect", (reason: string) => {
            console.log("\n\ndisconnect: " + reason);
        });

        socket.on(uploadChannelName, (request: UploadRequest, callback: (uploadResponse: UploadResponse) => void) => {
            if (request.requestType === UploadRequestType.UPLOAD_STOP) {
                writableTransform.end();
                callback(new UploadStopResponse());
            } else {
                throw new Error("UNKNOWN_SOCKET_EVENT:" + JSON.stringify(request));
            }
        });

        return {
            outputLocation: this.getConnectionUrl(connectionConfiguration),
            writable: writableTransform,
            transforms: [pausingTransform],
            getCommitKeys: () => {
                return [{ batchIdentifier }];
            }
        };
    }

    getConnectionUrl(connectionConfiguration: DPMConfiguration): string {
        if (typeof connectionConfiguration.url !== "string") {
            throw new Error("MISSING_CONNECITON_CONFIG_VALUE: url");
        }

        const uri = connectionConfiguration.url.replace(/^https/, "wss").replace(/^http/, "ws");

        return uri;
    }

    connectSocket(connectionConfiguration: DPMConfiguration, _credentialsConfiguration: DPMConfiguration): Socket {
        if (typeof connectionConfiguration.url !== "string") {
            throw new Error("connectionConfiguration does not include url value as string");
        }

        const uri = connectionConfiguration.url.replace(/^https/, "wss").replace(/^http/, "ws");

        const registryConfiguration = getRegistryConfig(connectionConfiguration.url);

        if (registryConfiguration == null) {
            throw new Error("REGISTRY_CONFIG_NOT_FOUND: " + uri);
        }

        return io(uri, {
            parser: require("socket.io-msgpack-parser"),
            transports: ["polling", "websocket"],
            auth: {
                token: registryConfiguration.apiKey
            }
        });
    }

    async commitAfterWrites(
        commitKeys: CommitKey[],
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<void> {
        const socket = this.connectSocket(connectionConfiguration, credentialsConfiguration);

        const request = new SetStreamActiveBatchesRequest(commitKeys.map((c) => c.batchIdentifier as BatchIdentifier));

        await new Promise<void>((resolve, reject) => {
            socket.on("connect", async () => {
                socket.once(SocketEvent.READY.toString(), () => {
                    socket.emit(
                        SocketEvent.SET_STREAM_ACTIVE_BATCHES.toString(),
                        request,
                        (response: SetStreamActiveBatchesResponse | ErrorResponse) => {
                            if (response.responseType === SocketResponseType.SET_STREAM_ACTIVE_BATCHES) {
                                // const batches = (response as SetStreamActiveBatchesResponse).batchIdentifiers;
                                socket.close();
                                resolve();
                            } else if (response.responseType === SocketResponseType.ERROR) {
                                const responseError = response as ErrorResponse;
                                reject(responseError.message);
                            }
                        }
                    );
                });
            });
            socket.once("connect_error", (error: unknown) => {
                console.log("connect_error", error);
                // TODO Handle error
            });

            socket.once("disconnect", (reason: string) => {
                console.log("\n\ndisconnect: " + reason);
            });
        });
    }

    filterDefaultConfigValues(
        _catalogSlug: string | undefined,
        _packageFile: PackageFile,
        _configuration: DPMConfiguration
    ): void {
        // Nothing to do
    }

    async saveSinkState(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration,
        _configuration: DPMConfiguration,
        _sinkStateKey: SinkStateKey,
        _sinkState: SinkState
    ): Promise<void> {
        // Nothing to do, the sink state is managed by teh server
    }

    async getSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        _sinkStateKey: SinkStateKey
    ): Promise<Maybe<SinkState>> {
        return null;

        // TODO implement server side sink state
    }

    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }
}
