import { randomUUID } from "crypto";
import { ErrorResponse, JobMessageRequest, JobRequestType, JobMessageResponse, Response, SocketError, StartPackageUpdateRequest, StartPackageUpdateResponse } from "datapm-lib";
import EventEmitter from "events";
import { AuthenticatedSocketContext } from "../context";
import { DistributedLockingService } from "../service/distributed-locking-service";
import { checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from 'socket.io';
import { ActivityLogEventType, Permission } from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { WebsocketJobContext } from "../job/WebsocketJobContext";
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

        this.socket.on(this.channelName,this.handleChannelEvents);


        callback(new StartPackageUpdateResponse(this.channelName));


    }
    stop(reason: "server" | "client" | "disconnect"): Promise<void> {

        return new Promise<void>((resolve) => {
             if(reason === "client") {
                this.socket.emit(this.channelName, new JobMessageResponse(JobRequestType.EXIT));
            } else if(reason === "disconnect") {

            } else if(reason === "server") {
            }

            this.socket.off(this.channelName,this.handleChannelEvents);

            this.removeLock();

            resolve();
        });
        
    }

    handleChannelEvents = async (request:JobMessageRequest, callback:(response:JobMessageResponse | ErrorResponse) => void) => {

          if(request.requestType === JobRequestType.EXIT) {
            this.stop("client");
            return;
        } else if(request.requestType === JobRequestType.START_JOB) {

            try {
                this.startJob();

                callback(new JobMessageResponse(JobRequestType.START_JOB));
            } catch(error) {
                callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
            }

        }

    }

    async startJob() {

        const jobId = "user-package-update-" + randomUUID();

        const context = new WebsocketJobContext(jobId, this.socketContext, this.socket, this.channelName);

        const job = new UpdatePackageJob(context, {
            reference: {
                ...this.request.packageIdentifier,
                registryURL: process.env["REGISTRY_URL"]!
            },
            defaults: true
        });

        const jobResult = await job.execute();

        const exitMessage = new JobMessageRequest(JobRequestType.EXIT);
        exitMessage.exitCode = jobResult.exitCode;

        this.socket.emit(this.channelName, exitMessage)

        this.stop("server");

    }


    async createLock():Promise<boolean> {

        const lock = this.distributedLockingService.lock(this.getLockKey());

        if(!lock) {
            this.socket.emit(this.channelName, SocketError.STREAM_LOCKED, {
                message: "Stream " + this.request.packageIdentifier.catalogSlug + "/" + this.request.packageIdentifier.packageSlug + " is locked by another session: " + lock,
                errorType: SocketError.STREAM_LOCKED
            });
            return false;
        }

        return true;
    }

    async removeLock():Promise<void> {
        this.distributedLockingService.unlock(this.getLockKey());
    }

    getLockKey():string {
        return PACKAGE_LOCK_PREFIX + "-" + this.request.packageIdentifier.catalogSlug + "/" + this.request.packageIdentifier.packageSlug;
    }
}