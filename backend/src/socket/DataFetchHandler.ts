import { SocketContext } from "../context";
import { checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from 'socket.io';
import { Permission } from "../generated/graphql";
import { EventEmitter, Transform } from "stream";
import {BatchUploadIdentifier, BatchingTransform, DataAcknowledge, DataSend, DataStop, DataStopAcknowledge, ErrorResponse, FetchRequest, FetchRequestType, FetchResponse, OpenFetchChannelRequest, OpenFetchChannelResponse, RecordContext, Request, Response, SocketError, SocketEvent, StartFetchRequest, DPMRecord, DataRecordContext } from "datapm-lib";
import { PackageRepository } from "../repository/PackageRepository";
import { DataStorageService, IterableDataFiles } from "../storage/data/data-storage";
import { DataBatchRepository } from "../repository/DataBatchRepository";

export function batchIdentifierToChannelName(batchIdentifier:BatchUploadIdentifier): string {
    return (
        batchIdentifier.catalogSlug +
        "/" +
        batchIdentifier.packageSlug +
        "/" +
        batchIdentifier.majorVersion +
        "/" +
        batchIdentifier.sourceType  +
        "/" +
        batchIdentifier.streamSetSlug  +
        "/" +
        batchIdentifier.streamSlug  +
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

    private channelName:string;

    constructor(private openChannelRequest: OpenFetchChannelRequest, private socket: SocketIO.Socket, private socketContext:SocketContext) {
        super();
    }

    async start(callback:(response:Response) => void): Promise<void> {
        this.channelName = batchIdentifierToChannelName(this.openChannelRequest.batchIdentifier);
       
        if(!await checkPackagePermission(this.socket, this.socketContext, callback, this.openChannelRequest.batchIdentifier, Permission.VIEW)) {
            return;
        }

        const packageEntity = await this.socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: this.openChannelRequest.batchIdentifier});

        await this.socketContext.connection
            .getCustomRepository(DataBatchRepository)
            .findBatchOrFail(
                packageEntity.id,
                this.openChannelRequest.batchIdentifier.majorVersion,
                this.openChannelRequest.batchIdentifier.sourceType,
                this.openChannelRequest.batchIdentifier.streamSetSlug,
                this.openChannelRequest.batchIdentifier.streamSlug,
                this.openChannelRequest.batchIdentifier.schemaTitle,
                this.openChannelRequest.batchIdentifier.batch
                );


        this.socket.on(this.channelName,this.handleChannelEvents)


        callback(new OpenFetchChannelResponse(this.channelName, this.openChannelRequest.batchIdentifier));


    }

    handleChannelEvents = async (fetchRequest:FetchRequest, callback:(response:FetchResponse | ErrorResponse) => void) => {

        if(fetchRequest.requestType === FetchRequestType.START) {
            this.handleStartRequest(fetchRequest as StartFetchRequest, callback);
        } else if(fetchRequest.requestType === FetchRequestType.STOP) {
            this.handleStopRequest(callback);
        }

        

    }

    async handleStartRequest(fetchRequest:StartFetchRequest, callback:(response:FetchResponse | ErrorResponse) => void) {

        const packageEntity = await this.socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: this.openChannelRequest.batchIdentifier});

        const batchEntity = await this.socketContext.connection
            .getCustomRepository(DataBatchRepository)
            .findBatchOrFail(
                packageEntity.id,
                this.openChannelRequest.batchIdentifier.majorVersion,
                this.openChannelRequest.batchIdentifier.sourceType,
                this.openChannelRequest.batchIdentifier.streamSetSlug,
                this.openChannelRequest.batchIdentifier.streamSlug,
                this.openChannelRequest.batchIdentifier.schemaTitle,
                this.openChannelRequest.batchIdentifier.batch
                );

        const iterableDataFiles = this.dataStorageService.readDataBatch(batchEntity.id, fetchRequest.offset);
    
        if(!iterableDataFiles) {
            callback(new ErrorResponse(`No data found for batch identifier ${this.openChannelRequest.batchIdentifier}`,SocketError.NOT_FOUND));
            this.stop("server");
            return;
        }

        setTimeout(() => this.startSending(fetchRequest, batchEntity.id),1);

    }

    async handleStopRequest(callback:(response:FetchResponse) => void) {
        this.stop("client");
        callback(new DataStopAcknowledge());
    }

    async stop(reason: "server" | "client" | "disconnect", error?: Error): Promise<void> {

        this.activeSending = false;

        this.socket.off(this.channelName, this.handleChannelEvents);

        if(reason === "client") {
            this.socket.emit(this.channelName, new DataStopAcknowledge());
        } else if(reason === "disconnect") {

        } else if(reason === "server") {
            this.socket.emit(this.channelName, new DataStop(),(response:DataStopAcknowledge) => {
                
            });
        }

        
        
    }

    async startSending(startRequest:StartFetchRequest, batchId: number): Promise<void> {

        const iterableDataStreams = await this.dataStorageService.readDataBatch(batchId, startRequest.offset);

        while(this.activeSending) {

            const dataFile = await iterableDataStreams.getNext();

            if(!dataFile) {
                this.stop("server");
                return;
            }

            await new Promise<void>((resolve, reject) => {

                const offsetFilterTransform = new Transform({
                    objectMode: true,
                    transform: (chunk: RecordContext, encoding, callback) => {
                        if(chunk.offset != undefined && chunk.offset >= startRequest.offset) {
                            callback(null, chunk);
                        } else {
                            callback();
                        }
                    }
                })

                const batchTransform = new BatchingTransform(10);
    
                dataFile.readable.pipe(offsetFilterTransform);
                offsetFilterTransform.pipe(batchTransform);
                batchTransform.on("data", (data:DataRecordContext[]) => {

                    if(!this.activeSending) {
                        if(!batchTransform.destroyed)
                            batchTransform.destroy();
                        return;
                    }
    
                    batchTransform.pause();

                    const dataSend = new DataSend(data);
                    this.socket.emit(this.channelName, dataSend, (response: DataAcknowledge ) => {
                        batchTransform.resume();
                    });
    
                });
    
                batchTransform.on("error", (error:Error) => {
                    this.socket.emit(this.channelName, new ErrorResponse(error.message, SocketError.SERVER_ERROR));
                    this.stop("server", error);
                    reject(error);
                })

                batchTransform.on("end", () => {
                    resolve();
                });
            
            });



        }


    }

}
