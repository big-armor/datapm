import { randomUUID } from "crypto";
import { ErrorResponse, JobMessageRequest, JobMessageType, JobMessageResponse, Response, SocketError, StartPackageUpdateRequest, StartPackageUpdateResponse } from "datapm-lib";
import EventEmitter from "events";
import { AuthenticatedSocketContext } from "../context";
import { DistributedLockingService } from "../service/distributed-locking-service";
import { checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from 'socket.io';
import { ActivityLogEventType, Permission } from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { BackendContext } from "../job/BackendContext";
import { UpdatePackageJob } from "datapm-client-lib";

const PACKAGE_LOCK_PREFIX = "package";


export class PackageUpdateHandler extends EventEmitter implements RequestHandler{

    private channelName:string;

    constructor(private request: StartPackageUpdateRequest, private socket: SocketIO.Socket, private socketContext:AuthenticatedSocketContext, private distributedLockingService: DistributedLockingService) {
        super();
            this.channelName = randomUUID();

    }

    async start(callback: (response: Response) => void): Promise<void> {
       
        if(!await checkPackagePermission(this.socket, this.socketContext, callback, this.request.packageIdentifier, Permission.EDIT)) {
            return;
        }

        if(!await this.createLock()) {
            return;
        }

        
        const packageEntity = await this.socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: this.request.packageIdentifier});

        let latestVersionEntity = await this.socketContext.connection.getCustomRepository(VersionRepository).findLatestVersionByPackageId({packageId:packageEntity.id});

        if(!latestVersionEntity) {
            callback(new ErrorResponse("This package has no versions. Publish a version of this package first",SocketError.NOT_VALID));
            return;
        }


        await createActivityLog(this.socketContext.connection, {
            userId: this.socketContext.me.id,
            eventType: ActivityLogEventType.PACKAGE_UPDATE_JOB_STARTED,
            targetPackageId: packageEntity.id,
            targetPackageVersionId: latestVersionEntity.id,
        });

        this.socket.on(this.channelName,this.handleChannelEvents)


        callback(new StartPackageUpdateResponse(this.channelName));


    }
    stop(reason: "server" | "client" | "disconnect"): Promise<void> {

        return new Promise<void>((resolve) => {
             if(reason === "client") {
                this.socket.emit(this.channelName, new JobMessageResponse(JobMessageType.EXIT));
            } else if(reason === "disconnect") {

            } else if(reason === "server") {
                this.socket.emit(this.channelName, new JobMessageRequest(JobMessageType.EXIT),(response:JobMessageResponse) => {
                    resolve();
                });
                return;
            }
        });
        
    }

    handleChannelEvents = async (request:JobMessageRequest, callback:(response:JobMessageResponse | ErrorResponse) => void) => {

          if(request.requestType === JobMessageType.EXIT) {
            this.stop("client");
            return;
        } else if(request.requestType === JobMessageType.START_JOB) {

            try {
                this.startJob();

                callback(new JobMessageResponse(JobMessageType.START_JOB));
            } catch(error) {
                callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
            }

        }

    }

    async startJob() {
        const context = new BackendContext(this.socketContext);

        const job = new UpdatePackageJob(context, {
            defaults: true
        });

        await job.execute();
    }


    async createLock():Promise<boolean> {

        const lock = this.distributedLockingService.lock(PACKAGE_LOCK_PREFIX + "-" + this.channelName);

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
        this.distributedLockingService.unlock(PACKAGE_LOCK_PREFIX + "-" + channelName);
    }
}