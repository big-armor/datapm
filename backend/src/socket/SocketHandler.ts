import {
    Response,
    ErrorResponse,
    SocketError,
    SocketEvent,
    StartUploadRequest,
    PackageStreamsRequest,
    SetStreamActiveBatchesRequest,
    OpenFetchProxyChannelRequest,
    PackageSinkStateRequest,
    StartPackageUpdateRequest,
    StartPackageRequest,
    StartFetchRequest
} from "datapm-lib";
import EventEmitter from "events";
import SocketIO from "socket.io";
import { AuthenticatedSocketContext, SocketContext } from "../context";
import { PackageEntity } from "../entity/PackageEntity";
import { CatalogIdentifierInput, PackageIdentifierInput, Permission } from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { DistributedLockingService } from "../service/distributed-locking-service";
import { isAuthenticatedContext } from "../util/contextHelpers";
import { DataFetchHandler } from "./DataFetchHandler";
import { DataUploadHandler } from "./DataUploadHandler";
import { SetActiveBatchesHandler } from "./SetActiveBatchesHandler";
import { SchemaInfoHandler } from "./PackageStreamsHandler";
import { PackageSinkStateHandler } from "./PackageSinkStateHandler";
import { PackageUpdateHandler } from "./PackageUpdateHandler";
import { CatalogEntity } from "../entity/CatalogEntity";
import { CatalogRepository } from "../repository/CatalogRepository";
import { PackageHandler } from "./PackageHandler";
import { FetchHandler } from "./FetchHandler";
import { hasPackagePermission } from "../directive/hasPackagePermissionDirective";
import { hasCatalogPermission } from "../directive/hasCatalogPermissionDirective";

export interface RequestHandler extends EventEmitter {
    start(callback: (response: Response) => void): Promise<void>;
    stop(reason: "server" | "client" | "disconnect"): Promise<void>;
}

/** Passes socket requests to process handlers. Represents one socket connection for a single user */
export class SocketConnectionHandler {
    requestHandlers: RequestHandler[] = [];

    constructor(
        private socket: SocketIO.Socket,
        private socketContext: SocketContext,
        private distributedLockingService: DistributedLockingService
    ) {
        const transport = socket.conn.transport.name; // in most cases, "polling"
        // console.log("connection with: " + transport);

        socket.conn.on("upgrade", () => {
            const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
            // console.log("upgraded connection: " + transport + " -> " + upgradedTransport);
        });

        socket.on(SocketEvent.OPEN_FETCH_CHANNEL.toString(), this.openFetchChannelHandler);
        socket.on(SocketEvent.START_DATA_UPLOAD.toString(), this.onUploadData);
        socket.on(SocketEvent.PACKAGE_VERSION_SINK_STATE_REQUEST.toString(), this.onGetPackageSinkState);
        socket.on(SocketEvent.SCHEMA_INFO_REQUEST.toString(), this.onGetSchemaInfo);
        socket.on(SocketEvent.SET_STREAM_ACTIVE_BATCHES.toString(), this.onSetStreamActiveBatches);
        socket.on(SocketEvent.START_PACKAGE_UPDATE.toString(), this.onStartPackageUpdate);
        socket.on(SocketEvent.START_PACKAGE.toString(), this.onStartPackage);
        socket.on(SocketEvent.START_FETCH.toString(), this.onStartFetch);

        socket.on("disconnect", this.onDisconnect);
        socket.on("error", () => console.log("Error"));

        socket.onAny((event) => {
            console.log("Unhandled event: " + event);
        });

        socket.emit(SocketEvent.READY.toString());
    }

    onDisconnect = (): void => {
        this.socket.on(SocketEvent.OPEN_FETCH_CHANNEL.toString(), this.openFetchChannelHandler);
        this.socket.on(SocketEvent.START_DATA_UPLOAD.toString(), this.onUploadData);
        this.socket.on(SocketEvent.SCHEMA_INFO_REQUEST.toString(), this.onGetSchemaInfo);
    };

    onStartFetch = async (request: StartFetchRequest, callback: (response: Response) => void): Promise<void> => {
        this.socketContext.cache.clear();

        if (!isAuthenticatedContext(this.socketContext)) {
            callback(new ErrorResponse("Not authenticated", SocketError.NOT_AUTHORIZED));
            return;
        }

        try {
            const handler = new FetchHandler(request, this.socket, this.socketContext as AuthenticatedSocketContext);
            this.addRequestHandler(handler);
            await handler.start(callback);
        } catch (error) {
            console.error(error);
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
        }
    };

    onStartPackage = async (request: StartPackageRequest, callback: (response: Response) => void): Promise<void> => {
        this.socketContext.cache.clear();

        if (!isAuthenticatedContext(this.socketContext)) {
            callback(new ErrorResponse("Not authenticated", SocketError.NOT_AUTHORIZED));
            return;
        }

        try {
            const handler = new PackageHandler(request, this.socket, this.socketContext as AuthenticatedSocketContext);
            this.addRequestHandler(handler);
            await handler.start(callback);
        } catch (error) {
            console.error(error);
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
        }
    };

    onStartPackageUpdate = async (
        request: StartPackageUpdateRequest,
        callback: (response: Response) => void
    ): Promise<void> => {
        this.socketContext.cache.clear();

        if (!isAuthenticatedContext(this.socketContext)) {
            callback(new ErrorResponse("Not authenticated", SocketError.NOT_AUTHORIZED));
            return;
        }

        try {
            const handler = new PackageUpdateHandler(
                request,
                this.socket,
                this.socketContext as AuthenticatedSocketContext,
                this.distributedLockingService
            );
            this.addRequestHandler(handler);
            await handler.start(callback);
        } catch (error) {
            console.error(error);
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
        }
    };

    openFetchChannelHandler = async (
        data: OpenFetchProxyChannelRequest,
        callback: (response: Response) => void
    ): Promise<void> => {
        this.socketContext.cache.clear();

        try {
            const dataFetchHandler = new DataFetchHandler(data, this.socket, this.socketContext);
            this.addRequestHandler(dataFetchHandler);
            await dataFetchHandler.start(callback);
        } catch (error) {
            console.error(error);
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
        }
    };

    onUploadData = async (request: StartUploadRequest, callback: (response: Response) => void): Promise<void> => {
        this.socketContext.cache.clear();

        if (!isAuthenticatedContext(this.socketContext)) {
            callback(new ErrorResponse("Not authenticated", SocketError.NOT_AUTHORIZED));
            return;
        }

        try {
            const uploadRequestHandler = new DataUploadHandler(
                request,
                this.socket,
                this.socketContext as AuthenticatedSocketContext,
                this.distributedLockingService
            );

            this.addRequestHandler(uploadRequestHandler);

            await uploadRequestHandler.start(callback);
        } catch (error) {
            console.error(error);
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
        }
    };

    onGetPackageSinkState = async (
        request: PackageSinkStateRequest,
        callback: (response: Response) => void
    ): Promise<void> => {
        this.socketContext.cache.clear();

        const hasPermission = await hasPackagePermission(Permission.VIEW, this.socketContext, request.identifier);

        if (!hasPermission) {
            callback(new ErrorResponse("Not authorized", SocketError.NOT_AUTHORIZED));
            return;
        }

        const response = await PackageSinkStateHandler.handle(this.socketContext, request);

        callback(response);
    };

    onGetSchemaInfo = async (request: PackageStreamsRequest, callback: (response: Response) => void): Promise<void> => {
        this.socketContext.cache.clear();

        const hasPermission = await hasPackagePermission(Permission.VIEW, this.socketContext, request.identifier);

        if (!hasPermission) {
            callback(new ErrorResponse("Not authorized", SocketError.NOT_AUTHORIZED));
            return;
        }

        const response = await SchemaInfoHandler.handle(this.socketContext, request);

        callback(response);
    };

    addRequestHandler(handler: RequestHandler): void {
        handler.on("stopped", () => {
            this.requestHandlers = this.requestHandlers.filter((h) => handler !== h);
        });

        this.requestHandlers.push(handler);
    }

    onSetStreamActiveBatches = async (
        request: SetStreamActiveBatchesRequest,
        callback: (response: Response) => void
    ): Promise<void> => {
        this.socketContext.cache.clear();

        if (!isAuthenticatedContext(this.socketContext)) {
            callback(new ErrorResponse("Not authenticated", SocketError.NOT_AUTHORIZED));
            return;
        }

        try {
            const handler = new SetActiveBatchesHandler(
                request,
                this.socket,
                this.socketContext as AuthenticatedSocketContext
            );

            this.addRequestHandler(handler);

            await handler.start(callback);
        } catch (error) {
            console.error(error);
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
        }
    };
}

export async function checkCatalogPermission(
    socket: SocketIO.Socket,
    socketContext: SocketContext,
    callback: (response: Response) => void,
    catalogIdentifier: CatalogIdentifierInput,
    permission: Permission
): Promise<boolean> {
    let catalogEntity: CatalogEntity;
    try {
        catalogEntity = await socketContext.connection
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlugOrFail(catalogIdentifier.catalogSlug);
    } catch (error) {
        if (error.message.includes("_NOT_VALID")) {
            callback(new ErrorResponse(error.message, SocketError.NOT_VALID));
            return false;
        } else if (error.message.includes("_NOT_FOUND")) {
            callback(new ErrorResponse("PACKAGE_OR_CATALOG_NOT_FOUND", SocketError.NOT_FOUND));
        } else {
            console.error(error);
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
        }
        return false;
    }

    const hasPermissions = await hasCatalogPermission(permission, socketContext, catalogIdentifier);

    if (!hasPermissions) {
        const response: ErrorResponse = new ErrorResponse(
            "NOT_AUTHORIZED: You don't have  " +
                permission +
                " permission to the catalog " +
                catalogIdentifier.catalogSlug,
            SocketError.NOT_AUTHORIZED
        );
        callback(response);
        return false;
    }

    return true;
}

export async function checkPackagePermission(
    socket: SocketIO.Socket,
    socketContext: SocketContext,
    callback: (response: Response) => void,
    schemaIdentifier: PackageIdentifierInput,
    permission: Permission
): Promise<boolean> {
    let packageEntity: PackageEntity;
    try {
        packageEntity = await socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({
            identifier: schemaIdentifier
        });
    } catch (error) {
        if (error.message.includes("_NOT_VALID")) {
            callback(new ErrorResponse(error.message, SocketError.NOT_VALID));
            return false;
        } else if (error.message.includes("_NOT_FOUND")) {
            callback(new ErrorResponse("PACKAGE_OR_CATALOG_NOT_FOUND", SocketError.NOT_FOUND));
        } else {
            console.error(error);
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
        }
        return false;
    }

    const hasPermission = await hasPackagePermission(permission, socketContext, schemaIdentifier);

    if (!hasPermission) {
        const response: ErrorResponse = new ErrorResponse(
            "NOT_AUTHORIZED: You don't have  " +
                permission +
                " permission to the package " +
                schemaIdentifier.catalogSlug +
                "/" +
                schemaIdentifier.packageSlug,
            SocketError.NOT_AUTHORIZED
        );
        callback(response);
        return false;
    }

    return true;
}
