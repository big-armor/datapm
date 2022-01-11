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
    SchemaUploadStreamIdentifier,
    UploadRequest,
    UploadRequestType,
    UploadResponse,
    ErrorResponse,
    StartUploadRequest,
    StartUploadResponse,
    UploadStopResponse,
    BatchUploadIdentifier,
    SetStreamActiveBatchesRequest,
    SetStreamActiveBatchesResponse,
    PackageVersionInfoResponse,
    RecordStreamContext,
    PackageVersionInfoRequest,
    SocketError,
    UploadDataRequest,
    UploadStopRequest
} from "datapm-lib";
import { Maybe } from "../../../util/Maybe";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { StreamSetProcessingMethod } from "../../../util/StreamToSinkUtil";
import { CommitKey, Sink, SinkSupportedStreamOptions, WritableWithContext } from "../../Sink";
import { DISPLAY_NAME, TYPE } from "./DataPMRepositoryDescription";
import { Transform } from "stream";
import { io, Socket } from "socket.io-client";
import { getRegistryConfig } from "../../../util/ConfigUtil";

export class DataPMSink implements Sink {
    serverChannelForRecordKey: Record<string, string> = {};
    offsetsByChannel: Record<string, number> = {};
    commitKeys: CommitKey[] = [];
    socket: Socket;

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

        if (typeof configuration.catalogSlug !== "string") {
            throw new Error("MISSING_CONFIG_VALUE: catalogSlug");
        }

        if (typeof configuration.packageSlug !== "string") {
            throw new Error("MISSING_CONFIG_VALUE: packageSlug");
        }

        if (typeof configuration.majorVersion !== "number") {
            throw new Error("MISSING_CONFIG_VALUE: majorVersion");
        }

        const socket = await this.connectSocket(connectionConfiguration, credentialsConfiguration);

        const writableTransform = new Transform({
            objectMode: true,
            transform: async (chunk: RecordStreamContext[], encoding, callback) => {
                const recordsByChannel: Record<string, RecordStreamContext[]> = {};

                for (const record of chunk) {
                    let serverChannel = this.serverChannelForRecord(record);
                    if (serverChannel == null) {
                        serverChannel = await this.startUploadRequest(socket, {
                            catalogSlug: configuration.catalogSlug as string,
                            packageSlug: configuration.packageSlug as string,
                            majorVersion: configuration.majorVersion as number,
                            streamSetSlug: record.streamSetSlug,
                            streamSlug: record.streamSlug,
                            sourceSlug: record.sourceSlug,
                            schemaTitle: record.recordContext.schemaSlug,
                            registryUrl: connectionConfiguration.url as string
                        });

                        this.serverChannelForRecordKey[this.recordToChannelKey(record)] = serverChannel;
                    }

                    if (recordsByChannel[serverChannel] == null) {
                        recordsByChannel[serverChannel] = [];
                    }

                    recordsByChannel[serverChannel].push(record);
                }

                const sendPromises: Promise<void>[] = [];

                for (const serverChannel of Object.keys(recordsByChannel)) {
                    const records = recordsByChannel[serverChannel];

                    const promise = this.sendRecords(socket, records, serverChannel);

                    sendPromises.push(promise);
                }

                await Promise.all(sendPromises);

                callback(null, chunk[chunk.length - 1]);
            },
            final: async (callback) => {
                const promises: Promise<void>[] = [];

                for (const serverChannel of Object.values(this.serverChannelForRecordKey)) {
                    const promise = new TimeoutPromise<void>(5000, (resolve, reject) => {
                        socket.emit(
                            serverChannel,
                            new UploadStopRequest(),
                            (response: UploadStopResponse | ErrorResponse) => {
                                if (response.responseType === SocketResponseType.ERROR) {
                                    const errorResponse = response as ErrorResponse;
                                    reject(errorResponse.message);
                                    return;
                                }
                                resolve();
                            }
                        );
                    });
                    promises.push(promise);
                }

                try {
                    await Promise.all(promises);
                } catch (error) {
                    // TODO get a context to log an error
                    console.log("error stopping upload: " + error.message);
                } finally {
                    if (socket.connected) {
                        socket.close();
                    }
                    callback();
                }
            }
        });

        return {
            outputLocation: this.getConnectionUrl(connectionConfiguration),
            writable: writableTransform,
            transforms: [],
            getCommitKeys: () => {
                return this.commitKeys;
            }
        };
    }

    serverChannelForRecord(record: RecordStreamContext): string {
        return this.serverChannelForRecordKey[this.recordToChannelKey(record)];
    }

    recordToChannelKey(record: RecordStreamContext): string {
        return record.sourceSlug + "-" + record.streamSetSlug + "-" + record.streamSlug;
    }

    async sendRecords(socket: Socket, records: RecordStreamContext[], serverChannel: string): Promise<void> {
        return new TimeoutPromise<void>(5000, (resolve) => {
            socket.emit(
                serverChannel,
                new UploadDataRequest(
                    records.map((r) => {
                        const offset: number =
                            r.recordContext.offset !== undefined
                                ? r.recordContext.offset
                                : this.offsetsByChannel[serverChannel] + 1;

                        this.offsetsByChannel[serverChannel] = offset;
                        return {
                            offset: offset,
                            record: r.recordContext.record
                        };
                    })
                ),
                (_response: StartUploadResponse) => {
                    resolve(); // TODO have the server emit last committed offset and use that here
                }
            );
        });
    }

    async startUploadRequest(socket: Socket, streamIdentifier: SchemaUploadStreamIdentifier): Promise<string> {
        const uploadRequest = new StartUploadRequest(streamIdentifier, true); // TODO support appending

        let uploadChannelName = "not-set";

        await new TimeoutPromise<void>(5000, (resolve, reject) => {
            socket.emit(
                SocketEvent.START_DATA_UPLOAD.toString(),
                uploadRequest,
                (response: StartUploadResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.START_DATA_UPLOAD_RESPONSE) {
                        uploadChannelName = (response as StartUploadResponse).channelName;
                        const batchIdentifier = (response as StartUploadResponse).batchIdentifier;
                        this.commitKeys.push({
                            batchIdentifier
                        });
                        resolve();
                    } else if (response.responseType === SocketResponseType.ERROR) {
                        const responseError = response as ErrorResponse;
                        reject(responseError.message);
                    }
                }
            );
        });

        socket.on(uploadChannelName, (request: UploadRequest, callback: (uploadResponse: UploadResponse) => void) => {
            if (request.requestType === UploadRequestType.UPLOAD_STOP) {
                delete this.serverChannelForRecordKey[uploadChannelName];
                callback(new UploadStopResponse());
            } else {
                throw new Error("UNKNOWN_SOCKET_EVENT:" + JSON.stringify(request));
            }
        });

        return uploadChannelName;
    }

    getConnectionUrl(connectionConfiguration: DPMConfiguration): string {
        if (typeof connectionConfiguration.url !== "string") {
            throw new Error("MISSING_CONNECITON_CONFIG_VALUE: url");
        }

        const uri = connectionConfiguration.url.replace(/^https/, "wss").replace(/^http/, "ws");

        return uri;
    }

    async connectSocket(
        connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration
    ): Promise<Socket> {
        if (typeof connectionConfiguration.url !== "string") {
            throw new Error("connectionConfiguration does not include url value as string");
        }

        if (this.socket != null && this.socket.connected) {
            return this.socket;
        }

        const uri = connectionConfiguration.url.replace(/^https/, "wss").replace(/^http/, "ws");

        const registryConfiguration = getRegistryConfig(connectionConfiguration.url);

        if (registryConfiguration == null) {
            throw new Error("REGISTRY_CONFIG_NOT_FOUND: " + uri);
        }

        this.socket = io(uri, {
            parser: require("socket.io-msgpack-parser"),
            transports: ["polling", "websocket"],
            auth: {
                token: registryConfiguration.apiKey
            }
        });

        await new TimeoutPromise<void>(5000, (resolve) => {
            this.socket.once("connect", async () => {
                this.socket.once(SocketEvent.READY.toString(), () => {
                    resolve();
                });
            });
        });

        return this.socket;
    }

    async commitAfterWrites(
        commitKeys: CommitKey[],
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<void> {
        const socket = await this.connectSocket(connectionConfiguration, credentialsConfiguration);

        const request = new SetStreamActiveBatchesRequest(
            commitKeys.map((c) => c.batchIdentifier as BatchUploadIdentifier)
        );

        await new TimeoutPromise<void>(10000, (resolve, reject) => {
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
            socket.once("connect_error", (_error: unknown) => {
                // console.log("connect_error", error);
                // TODO Handle error
            });

            socket.once("disconnect", (_reason: string) => {
                // console.log("\n\ndisconnect: " + reason);
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
        sinkStateKey: SinkStateKey
    ): Promise<Maybe<SinkState>> {
        const socket = await this.connectSocket(connectionConfiguration, credentialsConfiguration);

        const response = await new Promise<PackageVersionInfoResponse | ErrorResponse>((resolve) => {
            socket.emit(
                SocketEvent.PACKAGE_VERSION_DATA_INFO_REQUEST,
                new PackageVersionInfoRequest({
                    catalogSlug: sinkStateKey.catalogSlug,
                    packageSlug: sinkStateKey.packageSlug,
                    majorVersion: sinkStateKey.packageMajorVersion,
                    registryUrl: connectionConfiguration.url as string
                }),
                (response: PackageVersionInfoResponse | ErrorResponse) => {
                    resolve(response);
                }
            );
        });

        if (response.responseType === SocketResponseType.ERROR) {
            const errorResponse = response as ErrorResponse;

            if (errorResponse.errorType === SocketError.NOT_FOUND) {
                return null;
            }

            throw new Error((response as ErrorResponse).message);
        }

        return (response as PackageVersionInfoResponse).state;
    }

    getType(): string {
        return TYPE;
    }

    getDisplayName(): string {
        return DISPLAY_NAME;
    }
}
