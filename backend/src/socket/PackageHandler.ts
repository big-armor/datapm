import { randomUUID } from "crypto";
import {
    ErrorResponse,
    JobMessageRequest,
    JobRequestType,
    JobMessageResponse,
    Response,
    SocketError,
    StartPackageRequest,
    StartPackageResponse
} from "datapm-lib";
import EventEmitter from "events";
import { AuthenticatedSocketContext } from "../context";
import { DistributedLockingService } from "../service/distributed-locking-service";
import { checkCatalogPermission, RequestHandler } from "./SocketHandler";
import SocketIO from "socket.io";
import { ActivityLogEventType, Permission } from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { WebsocketJobContext } from "../job/WebsocketJobContext";
import { CatalogRepository } from "../repository/CatalogRepository";
import { PackageJob } from "datapm-client-lib";
import { validateCatalogSlug } from "../directive/ValidCatalogSlugDirective";
import { validatePackageSlug } from "../directive/ValidPackageSlugDirective";

const PACKAGE_LOCK_PREFIX = "package";

export class PackageHandler extends EventEmitter implements RequestHandler {
    private channelName: string;
    private catalogId: number;

    constructor(
        private request: StartPackageRequest,
        private socket: SocketIO.Socket,
        private socketContext: AuthenticatedSocketContext,
        private distributedLockingService: DistributedLockingService
    ) {
        super();
        this.channelName = randomUUID();
    }

    async start(callback: (response: Response) => void): Promise<void> {
        const catalogEntity = await this.socketContext.connection
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlugOrFail(this.request.catalogSlug);
        this.catalogId = catalogEntity.id;

        if (
            !(await checkCatalogPermission(
                this.socket,
                this.socketContext,
                callback,
                { catalogSlug: this.request.catalogSlug },
                Permission.EDIT
            ))
        ) {
            return;
        }

        validateCatalogSlug(this.request.catalogSlug);

        await createActivityLog(this.socketContext.connection, {
            userId: this.socketContext.me.id,
            eventType: ActivityLogEventType.PACKAGE_JOB_STARTED,
            targetCatalogId: this.catalogId
        });

        this.socket.on(this.channelName, this.handleChannelEvents);

        callback(new StartPackageResponse(this.channelName));
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
        const jobId = "user-package-" + randomUUID();

        const context = new WebsocketJobContext(jobId, this.socketContext, this.socket, this.channelName);

        const job = new PackageJob(context, {
            catalogSlug: this.request.catalogSlug,
            defaults: false
        });

        const jobResult = await job.execute();

        const exitMessage = new JobMessageRequest(JobRequestType.EXIT);
        exitMessage.exitCode = jobResult.exitCode;
        exitMessage.message = jobResult.errorMessage;

        this.socket.emit(this.channelName, exitMessage);

        await createActivityLog(this.socketContext.connection, {
            userId: this.socketContext.me.id,
            eventType: ActivityLogEventType.PACKAGE_JOB_ENDED,
            targetCatalogId: this.catalogId
        });

        this.stop("server");
    }
}
