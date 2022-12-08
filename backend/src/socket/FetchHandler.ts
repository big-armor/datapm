import { randomUUID } from "crypto";
import {
    ErrorResponse,
    JobMessageRequest,
    JobRequestType,
    JobMessageResponse,
    Response,
    SocketError,
    StartPackageResponse,
    StartFetchRequest
} from "datapm-lib";
import EventEmitter from "events";
import { AuthenticatedSocketContext } from "../context";
import { checkCatalogPermission, checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from "socket.io";
import { ActivityLogEventType, Permission } from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { WebsocketJobContext } from "../job/WebsocketJobContext";
import { CatalogRepository } from "../repository/CatalogRepository";
import { FetchPackageJob } from "datapm-client-lib";
import { validateCatalogSlug } from "../directive/ValidCatalogSlugDirective";
import { validatePackageSlug } from "../directive/ValidPackageSlugDirective";
import { PackageRepository } from "../repository/PackageRepository";

export class FetchHandler extends EventEmitter implements RequestHandler {
    private channelName: string;
    private catalogId: number;
    private packageId: number;

    constructor(
        private request: StartFetchRequest,
        private socket: SocketIO.Socket,
        private socketContext: AuthenticatedSocketContext
    ) {
        super();
        this.channelName = randomUUID();
    }

    async start(callback: (response: Response) => void): Promise<void> {
        validateCatalogSlug(this.request.catalogSlug);
        validatePackageSlug(this.request.packageSlug);

        await checkCatalogPermission(
            this.socket,
            this.socketContext,
            callback,
            { catalogSlug: this.request.catalogSlug },
            Permission.EDIT
        );

        await checkPackagePermission(
            this.socket,
            this.socketContext,
            callback,
            { catalogSlug: this.request.catalogSlug, packageSlug: this.request.packageSlug },
            Permission.EDIT
        );

        const catalogEntity = await this.socketContext.connection
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlugOrFail(this.request.catalogSlug);

        this.catalogId = catalogEntity.id;

        const packageEntity = await this.socketContext.connection
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({
                identifier: {
                    catalogSlug: this.request.catalogSlug,
                    packageSlug: this.request.packageSlug
                }
            });

        this.packageId = packageEntity.id;

        await createActivityLog(this.socketContext.connection, {
            userId: this.socketContext.me.id,
            eventType: ActivityLogEventType.FETCH_JOB_STARTED,
            targetCatalogId: catalogEntity.id,
            targetPackageId: packageEntity.id
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
        const jobId = "user-fetch-" + randomUUID();

        const context = new WebsocketJobContext(
            jobId,
            this.socketContext,
            this.socket,
            this.channelName,
            this.request.defaults
        );

        const job = new FetchPackageJob(context, {
            reference: this.request.catalogSlug + "/" + this.request.packageSlug,
            sinkType: this.request.sinkType,
            defaults: this.request.defaults
        });

        const jobResult = await job.execute();

        const exitMessage = new JobMessageRequest(JobRequestType.EXIT);
        exitMessage.jobResult = jobResult;

        this.socket.emit(this.channelName, exitMessage);

        await createActivityLog(this.socketContext.connection, {
            userId: this.socketContext.me.id,
            eventType: ActivityLogEventType.FETCH_JOB_ENDED,
            targetCatalogId: this.catalogId,
            targetPackageId: this.packageId
        });

        this.stop("server");
    }
}
