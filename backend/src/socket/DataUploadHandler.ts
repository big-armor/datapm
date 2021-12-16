import { AuthenticatedSocketContext } from "../context";
import { DistributedLockingService } from "../service/distributed-locking-service";
import SocketIO from 'socket.io';
import { checkPackagePermission, RequestHandler } from "./SocketHandler";
import { Permission } from "../generated/graphql";
import { BatchIdentifier, DataRecordContext, DPMRecord, ErrorResponse, RecordContext, Response, SocketError, SocketEvent,  StartUploadRequest,  StartUploadResponse,  StreamIdentifier, TimeoutPromise, UploadDataRequest, UploadDataResponse, UploadRequest, UploadRequestType, UploadResponse, UploadStopRequest, UploadStopResponse } from "datapm-lib";
import EventEmitter from "events";
import { PassThrough } from "stream";
import { PackageRepository } from "../repository/PackageRepository";
import { DataStorageService } from "../storage/data/data-storage";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { DataBatchEntity } from "../entity/DataBatchEntity";
import { Maybe } from "graphql/jsutils/Maybe";
import { PackageFileStorageService } from "../storage/packages/package-file-storage-service";
import { VersionRepository } from "../repository/VersionRepository";

const LOCK_PREFIX = "streamSetDataUpload";


export function streamIdentifierToChannelName(streamIdentifier: StreamIdentifier): string {
    return (
        streamIdentifier.catalogSlug +
        "/" +
        streamIdentifier.packageSlug +
        "/" +
        streamIdentifier.majorVersion +
        "/" +
        streamIdentifier.schemaTitle +
        "/" +
        streamIdentifier.streamSlug  +
        "/fetch"
    );
}

/** Manages the state of uploading data from a stream client. Only one upload per batch at at time.
 * 
 *  A single major package schema version may have 
 * many sub versions (1.0.0 and 1.1.0 and 1.2.1, etc). An upload of data for any one major version of the
 * schema should validate against all subversions of the schema. 
 * 
 * A data batch is like a version of uploaded data. A batch of a stream is uploaded once, and then may be
 * uploaded again (batch 2). 
 * 
 * After a batch is uploaded, the client must tell the server to make the new batch the active batch - so that
 * other clients are served the correct batch. This can be done immediately after the upload is completed, 
 * or all at once after many stream batches are completed (so that the state of the data is consistent). 
 * 
 * Client's requesting data should read the batches numbers for all requested streams at once, and so
 * that the transactionality of reading while an upload is proceeding is preserved.  
 */
export class DataUploadHandler extends EventEmitter implements RequestHandler{
    
    private readonly dataStorageService = DataStorageService.INSTANCE;
    private readonly packageFileStorage = PackageFileStorageService.INSTANCE;

    private stream: PassThrough;

    namespace:string[];
    channelName:string;
    majorVersion:number;
    stopped:boolean = false;
    fileName:string;
    paused:boolean = false;
    recordCount:number = 0;
    lastSavedOffset = 0;

    private batchIdentifier:BatchIdentifier;

    constructor(private uploadRequest: StartUploadRequest, private socket: SocketIO.Socket, private socketContext:AuthenticatedSocketContext, private distributedLockingService: DistributedLockingService) {
        super();
        this.channelName = streamIdentifierToChannelName(this.uploadRequest.streamIdentifier);
    }

    async start(callback:(response:Response) => void) {

        if(!await checkPackagePermission(this.socket, this.socketContext, callback, this.uploadRequest.streamIdentifier, Permission.EDIT)) {
            return;
        }
                  
        if(!await this.createLock()) {
            return;
        }

        const packageEntity = await this.socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: this.uploadRequest.streamIdentifier});


        let batchEntity = await this.socketContext.connection.getCustomRepository(DataBatchRepository).findLatestBatch({identifier: this.uploadRequest.streamIdentifier});

        let latestVersionEntity = await this.socketContext.connection.getCustomRepository(VersionRepository).findLatestVersionByPackageId({packageId:packageEntity.id});

        if(!latestVersionEntity) {
            callback(new ErrorResponse("This package has no versions. Publish a version of this package first",SocketError.NOT_VALID));
            return;
        }

        const packageFile = await this.packageFileStorage.readPackageFile(packageEntity.id, {
            catalogSlug: this.uploadRequest.streamIdentifier.catalogSlug,
            packageSlug: packageEntity.slug,
            versionMajor: latestVersionEntity.majorVersion,
            versionMinor: latestVersionEntity.minorVersion,
            versionPatch: latestVersionEntity.patchVersion,
        });


        if(packageFile.schemas.find((s) => s.title === this.uploadRequest.streamIdentifier.schemaTitle) == null){ 
            callback(new ErrorResponse("SCHEMA_NOT_VALID: This package does not have a schema with a title equal to the provdied streamSetSlug: " + this.uploadRequest.streamIdentifier.schemaTitle,SocketError.NOT_VALID));
            return;
        }


        let offSet = 0;

        if(this.uploadRequest.newBatch || !batchEntity) {
            
            this.batchIdentifier = {
                ... this.uploadRequest.streamIdentifier,
                batch: batchEntity ? batchEntity.batch + 1 : 1
            }
            
            await this.socketContext.connection.getCustomRepository(DataBatchRepository).save(this.socketContext.me.id, this.batchIdentifier);

        } else {

            this.batchIdentifier = {
                ...this.uploadRequest.streamIdentifier,
                batch: batchEntity.batch
            }

            offSet = batchEntity.lastOffset + 1;

        }


        this.paused = false;

        // FIXME This will cause consistency issues because offset is updated before the data is actually written.
        // Need to refactor the data storage service to pass through the records actually written, so that the 
        // proper offset can be used. However that's tricky for Google Cloud Storage and S3 destinations - because
        // they are not actually written until the stream is closed. 
        this.stream = new PassThrough({
            objectMode: true,
            transform: (chunk:DPMRecord, encoding, callback) => {

                this.lastSavedOffset = offSet;
                const recordContext:DataRecordContext = {
                    offset: offSet++,
                    record: chunk,
                }
                callback(null, recordContext);
            }
        });

        this.dataStorageService.writeBatch(packageEntity.id,this.batchIdentifier,offSet,this.stream)

        this.socket.on(this.channelName, this.handleEvent);
        this.socket.on("disconnect",(reason) => this.stop("disconnect"));
        this.socket.on("connect_error", (reason) => this.stop("disconnect"));

        callback(new StartUploadResponse(this.channelName, this.batchIdentifier));

    }


    async stop(serverOrClient: "server" | "client" | "disconnect") {

        if(this.stopped) {
            return;
        }

        this.stopped = true;

        this.socket.off(this.channelName, this.handleEvent);

        if(serverOrClient === "server") {
            try {
                new TimeoutPromise<void>(1000,(resolve:()=>void) => {
                    this.emit(this.channelName, new UploadStopRequest(), (response:UploadStopResponse)=> {
                        resolve()
                    });
                });
            } catch(e) {
                console.log("Client did not acknowledge stop upload request")
            }
        }

        await new Promise<void>((resolve,reject) => {
            this.stream.end(()=> {
                resolve();
            });
        });

        if(this.lastSavedOffset) {

            let batchEntity = await this.socketContext.connection.getCustomRepository(DataBatchRepository).findLatestBatch({identifier: this.uploadRequest.streamIdentifier});

            if(!batchEntity) {
                throw new Error("BATCH_NOT_FOUND");
            }

            if(this.lastSavedOffset > batchEntity.lastOffset) {
                batchEntity.lastOffset = this.lastSavedOffset;
                this.socketContext.connection.getRepository(DataBatchEntity).save(batchEntity);
            }

        }



        this.removeLock(this.channelName);

    }

    async createLock():Promise<boolean> {

        const lock = this.distributedLockingService.lock(LOCK_PREFIX + "-" + this.channelName);

        if(!lock) {
            this.socket.emit(this.channelName, SocketError.STREAM_LOCKED, {
                message: "Stream " + this.channelName + " is locked by another session: " + lock,
                errorType: SocketError.STREAM_LOCKED
            });
            return false;
        }

        return true;
    }

    async removeLock(channelName:string):Promise<void> {
        this.distributedLockingService.unlock(LOCK_PREFIX + "-" + channelName);
    }

    /** Handles incoming messages on the 'channel' (events with name matching the channelName value) */
     handleEvent = async (request:UploadRequest, callback:(response:UploadResponse) => void) => {

        if(request.requestType === UploadRequestType.UPLOAD_DATA) {

            await this.handleData(request as UploadDataRequest);

            callback(new UploadDataResponse());
            
        } else if(request.requestType === UploadRequestType.UPLOAD_STOP) {

            await this.handleEnd(request as UploadStopRequest);

            callback(new UploadStopResponse());

        }

    }

    async handleData(request:UploadDataRequest) {
        for(const record of request.records) {
            this.recordCount++;
            const response = this.stream.write(record,undefined,(error) => {
                if(error) {
                    this.socket.emit(this.channelName,new ErrorResponse(error.message,SocketError.SERVER_ERROR));
                    this.stop("server");
                    return;
                }
            });

            if(!response) {
                await new Promise<void>((resolve,reject) => {
                    this.stream.once("drain",() => {
                        resolve();
                    });
                });
            }
        }
    }

    async handleEnd(event:UploadStopRequest) {
        await this.stop("client");
    }

}