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
import { checkCatalogPermission, checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from "socket.io";
import { ActivityLogEventType, Permission } from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { WebsocketJobContext } from "../job/WebsocketJobContext";
import { CatalogRepository } from "../repository/CatalogRepository";
import { PackageJob } from "datapm-client-lib";
import { validateCatalogSlug } from "../directive/ValidCatalogSlugDirective";
import { validatePackageSlug } from "../directive/ValidPackageSlugDirective";
import { PackageRepository } from "../repository/PackageRepository";

const PACKAGE_LOCK_PREFIX = "package";

export class PackageHandler extends EventEmitter implements RequestHandler {
    private channelName: string;
    private catalogId: number;

    constructor(
        private request: StartPackageRequest,
        private socket: SocketIO.Socket,
        private socketContext: AuthenticatedSocketContext
    ) {
        super();
        this.channelName = randomUUID();
    }

    async start(callback: (response: Response) => void): Promise<void> {
        const catalogEntity = await this.socketContext.connection
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlugOrFail(this.request.catalogSlug);
        this.catalogId = catalogEntity.id;

        validateCatalogSlug(this.request.catalogSlug);
        validatePackageSlug(this.request.packageSlug);
        // TODO Validate package title and description

        // check if package exists
        const packageEntity = await this.socketContext.connection.getCustomRepository(PackageRepository).findPackage({
            identifier: {
                catalogSlug: this.request.catalogSlug,
                packageSlug: this.request.packageSlug
            }
        });

        if (!packageEntity) {
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

            this.socketContext.connection.getCustomRepository(PackageRepository).createPackage({
                packageInput: {
                    catalogSlug: this.request.catalogSlug,
                    packageSlug: this.request.packageSlug,
                    displayName: this.request.packageTitle,
                    description: this.request.packageDescription
                },
                userId: this.socketContext.me.id
            });
        } else {
            if (
                !(await checkPackagePermission(
                    this.socket,
                    this.socketContext,
                    callback,
                    { catalogSlug: this.request.catalogSlug, packageSlug: this.request.packageSlug },
                    Permission.EDIT
                ))
            ) {
                return;
            }
        }
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

        const context = new WebsocketJobContext(
            jobId,
            this.socketContext,
            this.socket,
            this.channelName,
            this.request.defaults
        );

        const job = new PackageJob(context, {
            catalogSlug: this.request.catalogSlug,
            packageSlug: this.request.packageSlug,
            packageTitle: this.request.packageTitle,
            description: this.request.packageDescription,
            version: "1.0.0",
            defaults: this.request.defaults
        });

        const jobResult = await job.execute();

        const exitMessage = new JobMessageRequest(JobRequestType.EXIT);
        exitMessage.jobResult = jobResult;

        this.socket.emit(this.channelName, exitMessage);

        await createActivityLog(this.socketContext.connection, {
            userId: this.socketContext.me.id,
            eventType: ActivityLogEventType.PACKAGE_JOB_ENDED,
            targetCatalogId: this.catalogId
        });

        this.stop("server");
    }
}
