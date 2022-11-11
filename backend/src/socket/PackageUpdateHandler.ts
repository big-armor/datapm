import { randomUUID } from "crypto";
import {
    ErrorResponse,
    JobMessageRequest,
    JobRequestType,
    JobMessageResponse,
    Response,
    SocketError,
    StartPackageUpdateRequest,
    StartPackageUpdateResponse
} from "datapm-lib";
import EventEmitter from "events";
import { AuthenticatedSocketContext } from "../context";
import { DistributedLockingService } from "../service/distributed-locking-service";
import { checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from "socket.io";
import { ActivityLogEventType, Permission } from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { WebsocketJobContext } from "../job/WebsocketJobContext";
import { UpdatePackageJob } from "datapm-client-lib";
import { getEnvVariable } from "../util/getEnvVariable";

const PACKAGE_LOCK_PREFIX = "package";

export class PackageUpdateHandler extends EventEmitter implements RequestHandler {
    private channelName: string;

    constructor(
        private request: StartPackageUpdateRequest,
        private socket: SocketIO.Socket,
        private socketContext: AuthenticatedSocketContext,
        private distributedLockingService: DistributedLockingService
    ) {
        super();
        this.channelName = randomUUID();
    }

    async start(callback: (response: Response) => void): Promise<void> {
        if (
            !(await checkPackagePermission(
                this.socket,
                this.socketContext,
                callback,
                this.request.packageIdentifier,
                Permission.EDIT
            ))
        ) {
            return;
        }

        if (!(await this.createLock())) {
            throw new Error("COULD_NOT_CREATE_PACKAGE_UPDATE_LOCK");
        }

        const packageEntity = await this.socketContext.connection
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: this.request.packageIdentifier });

        const latestVersionEntity = await this.socketContext.connection
            .getCustomRepository(VersionRepository)
            .findLatestVersionByPackageId({ packageId: packageEntity.id });

        if (!latestVersionEntity) {
            callback(
                new ErrorResponse(
                    "This package has no versions. Publish a version of this package first",
                    SocketError.NOT_VALID
                )
            );
            return;
        }

        await createActivityLog(this.socketContext.connection, {
            userId: this.socketContext.me.id,
            eventType: ActivityLogEventType.PACKAGE_UPDATE_JOB_STARTED,
            targetPackageId: packageEntity.id,
            targetPackageVersionId: latestVersionEntity.id
        });

        this.socket.on(this.channelName, this.handleChannelEvents);

        this.socket.on("disconnect", () => {
            this.stop("disconnect");
        });

        callback(new StartPackageUpdateResponse(this.channelName));
    }

    stop(reason: "server" | "client" | "disconnect"): Promise<void> {
        return new Promise<void>((resolve) => {
            if (reason === "client") {
                this.socket.emit(this.channelName, new JobMessageResponse(JobRequestType.EXIT));
            } else if (reason === "disconnect") {
                // Nothing to do
            } else if (reason === "server") {
                // Nothing to do
            }

            this.socket.off(this.channelName, this.handleChannelEvents);

            this.removeLock();

            resolve();
        });
    }

    handleChannelEvents = async (
        request: JobMessageRequest,
        callback: (response: JobMessageResponse | ErrorResponse) => void
    ): Promise<void> => {
        if (request.requestType === JobRequestType.EXIT) {
            this.stop("client");
        } else if (request.requestType === JobRequestType.START_JOB) {
            try {
                this.startJob();

                callback(new JobMessageResponse(JobRequestType.START_JOB));
            } catch (error) {
                callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
            }
        }
    };

    async startJob(): Promise<void> {
        const jobId = "user-package-update-" + randomUUID();

        const context = new WebsocketJobContext(
            jobId,
            this.socketContext,
            this.socket,
            this.channelName,
            this.request.defaults
        );

        if (getEnvVariable("REGISTRY_URL") == null) {
            throw new Error("REGISTRY_URL is not defined");
        }

        const job = new UpdatePackageJob(context, {
            reference: {
                ...this.request.packageIdentifier,
                registryURL: getEnvVariable("REGISTRY_URL")
            },
            defaults: true
        });

        const jobResult = await job.execute();

        const exitMessage = new JobMessageRequest(JobRequestType.EXIT);
        exitMessage.jobResult = jobResult;

        this.socket.emit(this.channelName, exitMessage);

        return this.stop("server");
    }

    async createLock(): Promise<boolean> {
        const lock = await this.distributedLockingService.lock(this.getLockKey());

        if (!lock) {
            this.socket.emit(this.channelName, SocketError.STREAM_LOCKED, {
                message:
                    "Stream " +
                    this.request.packageIdentifier.catalogSlug +
                    "/" +
                    this.request.packageIdentifier.packageSlug +
                    " is locked by another session: " +
                    lock,
                errorType: SocketError.STREAM_LOCKED
            });
            return false;
        }

        return true;
    }

    async removeLock(): Promise<void> {
        return this.distributedLockingService.unlock(this.getLockKey());
    }

    getLockKey(): string {
        return (
            PACKAGE_LOCK_PREFIX +
            "-" +
            this.request.packageIdentifier.catalogSlug +
            "/" +
            this.request.packageIdentifier.packageSlug
        );
    }
}
