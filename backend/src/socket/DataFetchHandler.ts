import { SocketContext, AuthenticatedContext } from "../context";
import { checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from "socket.io";
import { ActivityLogEventType, Permission } from "../generated/graphql";
import { EventEmitter, Transform } from "stream";
import {
    BatchRepositoryIdentifier,
    DataAcknowledge,
    DataSend,
    DataStop,
    DataStopAcknowledge,
    ErrorResponse,
    ProxyFetchRequest,
    ProxyFetchRequestType,
    ProxyFetchResponse,
    OpenFetchProxyChannelRequest,
    OpenFetchProxyChannelResponse,
    RecordContext,
    Request,
    Response,
    SocketError,
    SocketEvent,
    StartProxyFetchRequest,
    DPMRecord,
    DataRecordContext,
    SocketResponseType
} from "datapm-lib";
import { PackageRepository } from "../repository/PackageRepository";
import { DataStorageService } from "../storage/data/data-storage";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { BatchingTransform } from "../transforms/BatchingTransform";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { DataBatchEntity } from "../entity/DataBatchEntity";
import { PackageEntity } from "../entity/PackageEntity";

export function batchIdentifierToChannelName(batchIdentifier: BatchRepositoryIdentifier): string {
    return (
        batchIdentifier.catalogSlug +
        "/" +
        batchIdentifier.packageSlug +
        "/" +
        batchIdentifier.majorVersion +
        "/" +
        batchIdentifier.sourceSlug +
        "/" +
        batchIdentifier.streamSetSlug +
        "/" +
        batchIdentifier.streamSlug +
        "/" +
        batchIdentifier.schemaTitle +
        "/" +
        batchIdentifier.batch +
        "/fetch"
    );
}

export class DataFetchHandler extends EventEmitter implements RequestHandler {
    private readonly dataStorageService = DataStorageService.INSTANCE;

    private activeSending = true;

    private packageEntity: PackageEntity;
    private batchEntity: DataBatchEntity;
    private authenticatedContext: AuthenticatedContext | null;

    private channelName: string;

    constructor(
        private openChannelRequest: OpenFetchProxyChannelRequest,
        private socket: SocketIO.Socket,
        private socketContext: SocketContext
    ) {
        super();
        this.authenticatedContext =
            (socketContext as AuthenticatedContext).me != null ? (socketContext as AuthenticatedContext) : null;
    }

    async start(callback: (response: Response) => void): Promise<void> {
        this.channelName = batchIdentifierToChannelName(this.openChannelRequest.batchIdentifier);

        if (
            !(await checkPackagePermission(
                this.socket,
                this.socketContext,
                callback,
                this.openChannelRequest.batchIdentifier,
                Permission.VIEW
            ))
        ) {
            return;
        }

        this.packageEntity = await this.socketContext.connection
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: this.openChannelRequest.batchIdentifier });

        await this.socketContext.connection
            .getCustomRepository(DataBatchRepository)
            .findBatchOrFail(
                this.packageEntity.id,
                this.openChannelRequest.batchIdentifier.majorVersion,
                this.openChannelRequest.batchIdentifier.sourceType,
                this.openChannelRequest.batchIdentifier.sourceSlug,
                this.openChannelRequest.batchIdentifier.streamSetSlug,
                this.openChannelRequest.batchIdentifier.streamSlug,
                this.openChannelRequest.batchIdentifier.schemaTitle,
                this.openChannelRequest.batchIdentifier.batch
            );

        this.socket.on(this.channelName, this.handleChannelEvents);

        callback(new OpenFetchProxyChannelResponse(this.channelName, this.openChannelRequest.batchIdentifier));
    }

    handleChannelEvents = async (
        fetchRequest: ProxyFetchRequest,
        callback: (response: ProxyFetchResponse | ErrorResponse) => void
    ): Promise<void> => {
        if (fetchRequest.requestType === ProxyFetchRequestType.START) {
            this.handleStartRequest(fetchRequest as StartProxyFetchRequest, callback);
        } else if (fetchRequest.requestType === ProxyFetchRequestType.STOP) {
            this.handleStopRequest(callback);
        }
    };

    async handleStartRequest(
        fetchRequest: StartProxyFetchRequest,
        callback: (response: ProxyFetchResponse | ErrorResponse) => void
    ): Promise<void> {
        this.batchEntity = await this.socketContext.connection
            .getCustomRepository(DataBatchRepository)
            .findBatchOrFail(
                this.packageEntity.id,
                this.openChannelRequest.batchIdentifier.majorVersion,
                this.openChannelRequest.batchIdentifier.sourceType,
                this.openChannelRequest.batchIdentifier.sourceSlug,
                this.openChannelRequest.batchIdentifier.streamSetSlug,
                this.openChannelRequest.batchIdentifier.streamSlug,
                this.openChannelRequest.batchIdentifier.schemaTitle,
                this.openChannelRequest.batchIdentifier.batch
            );

        const iterableDataFiles = this.dataStorageService.readDataBatch(this.batchEntity.id, fetchRequest.offset);

        await createActivityLog(this.socketContext.connection, {
            userId: this.authenticatedContext?.me.id,
            eventType: ActivityLogEventType.DATA_BATCH_DOWNLOAD_STARTED,
            targetPackageId: this.packageEntity.id,
            targetDataBatchId: this.batchEntity.id
        });

        if (!iterableDataFiles) {
            callback(
                new ErrorResponse(
                    `No data found for batch identifier ${this.openChannelRequest.batchIdentifier}`,
                    SocketError.NOT_FOUND
                )
            );
            this.stop("server");
            return;
        }

        setTimeout(() => this.startSendingWrapper(fetchRequest, this.batchEntity.id), 1);
    }

    async handleStopRequest(callback: (response: ProxyFetchResponse) => void): Promise<void> {
        this.stop("client");
        callback(new DataStopAcknowledge());
    }

    async stop(reason: "server" | "client" | "disconnect", error?: Error): Promise<void> {
        this.activeSending = false;

        this.socket.off(this.channelName, this.handleChannelEvents);

        await createActivityLog(this.socketContext.connection, {
            userId: this.authenticatedContext?.me.id,
            eventType: ActivityLogEventType.DATA_BATCH_DOWNLOAD_STOPPED,
            targetPackageId: this.packageEntity.id,
            targetDataBatchId: this.batchEntity.id
        });

        if (reason === "client") {
            this.socket.emit(this.channelName, new DataStopAcknowledge());
        } else if (reason === "disconnect") {
            // nothing to do
        } else if (reason === "server") {
            this.socket.emit(this.channelName, new DataStop());
        }
    }

    async startSendingWrapper(startRequest: StartProxyFetchRequest, batchId: number): Promise<void> {
        try {
            await this.startSending(startRequest, batchId);
        } catch (error) {
            console.log("Error while reading data.");
            console.log("Start Request: " + JSON.stringify(startRequest));
            console.log("Batch Id: " + batchId);
            console.log("Error: " + JSON.stringify(error));
            this.socket.emit(this.channelName, new ErrorResponse("ERROR_READING_DATA", SocketError.SERVER_ERROR));
            this.stop("server");
        }
    }

    async startSending(startRequest: StartProxyFetchRequest, batchId: number): Promise<void> {
        const iterableDataStreams = await this.dataStorageService.readDataBatch(batchId, startRequest.offset);

        while (this.activeSending) {
            const dataFile = await iterableDataStreams.getNext();

            if (!dataFile) {
                this.stop("server");
                return;
            }

            await new Promise<void>((resolve, reject) => {
                const offsetFilterTransform = new Transform({
                    objectMode: true,
                    transform: (chunk: RecordContext, encoding, callback) => {
                        if (chunk.offset != null && chunk.offset >= startRequest.offset) {
                            callback(null, chunk);
                        } else {
                            callback();
                        }
                    }
                });

                const batchTransform = new BatchingTransform(250);

                dataFile.readable.pipe(offsetFilterTransform);
                offsetFilterTransform.pipe(batchTransform);
                batchTransform.on("data", (data: DataRecordContext[]) => {
                    if (!this.activeSending) {
                        if (!batchTransform.destroyed) batchTransform.destroy();
                        return;
                    }

                    batchTransform.pause();

                    const dataSend = new DataSend(data);
                    this.socket.emit(this.channelName, dataSend, (response: DataAcknowledge | ErrorResponse) => {
                        if (response.responseType === SocketResponseType.ERROR) {
                            console.log("Error from client: " + JSON.stringify(response));
                        }

                        batchTransform.resume();
                    });
                });

                batchTransform.on("error", (error: Error) => {
                    this.socket.emit(this.channelName, new ErrorResponse(error.message, SocketError.SERVER_ERROR));
                    this.stop("server", error);
                    reject(error);
                });

                batchTransform.on("end", () => {
                    resolve();
                });
            });
        }
    }
}
