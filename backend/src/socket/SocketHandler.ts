import {Response, ErrorResponse, SocketError, SocketEvent, StreamIdentifier, StartUploadRequest, StartUploadResponse, SchemaInfoRequest, FetchRequest, SetStreamActiveBatchesRequest, StartFetchRequest, OpenFetchChannelRequest } from 'datapm-lib';
import EventEmitter from 'events';
import SocketIO from 'socket.io';
import { AuthenticatedSocketContext, SocketContext } from '../context';
import { PackageEntity } from '../entity/PackageEntity';
import { Permission } from '../generated/graphql';
import { PackageRepository } from '../repository/PackageRepository';
import { hasPackageEntityPermissions } from '../resolvers/UserPackagePermissionResolver';
import { DistributedLockingService } from '../service/distributed-locking-service';
import { isAuthenticatedContext } from '../util/contextHelpers';
import { DataFetchHandler } from './DataFetchHandler';
import { DataUploadHandler } from './DataUploadHandler';
import { SetActiveBatchesHandler } from './SetActiveBatchesHandler';
import { SchemaInfoHandler } from './SchemaInfoHandler';

export interface RequestHandler extends EventEmitter {
    start(callback:(response:Response) => void):Promise<void>;
    stop(reason: "server" | "client" | "disconnect"):Promise<void>;
}

/** Passes socket requests to process handlers. Represents one socket connection for a single user */
export class SocketConnectionHandler {


    requestHandlers: RequestHandler[] = [];

    constructor(private socket: SocketIO.Socket, private socketContext:SocketContext, private distributedLockingService: DistributedLockingService) {
        

        const transport = socket.conn.transport.name; // in most cases, "polling"
        // console.log("connection with: " + transport);


        socket.conn.on("upgrade", () => {
            const upgradedTransport = socket.conn.transport.name; // in most cases, "websocket"
            // console.log("upgraded connection: " + transport + " -> " + upgradedTransport);
        });

        socket.on(SocketEvent.OPEN_FETCH_CHANNEL.toString(), this.openFetchChannelHandler);
        socket.on(SocketEvent.START_DATA_UPLOAD.toString(), this.onUploadData);
        socket.on(SocketEvent.SCHEMA_INFO_REQUEST.toString(), this.onGetSchemaInfo);
        socket.on(SocketEvent.SET_STREAM_ACTIVE_BATCHES.toString(), this.onSetStreamActiveBatches);

        socket.on('disconnect', this.onDisconnect);
        socket.on('error', () => console.log("Error"));

        socket.emit(SocketEvent.READY.toString());
    }

    onDisconnect = ():void =>  {
        this.socket.on(SocketEvent.OPEN_FETCH_CHANNEL.toString(), this.openFetchChannelHandler);
        this.socket.on(SocketEvent.START_DATA_UPLOAD.toString(), this.onUploadData);
        this.socket.on(SocketEvent.SCHEMA_INFO_REQUEST.toString(), this.onGetSchemaInfo);
    };

    openFetchChannelHandler = async (data:OpenFetchChannelRequest, callback:(response:Response)=>void):Promise<void> => {


        try {
            const dataFetchHandler = new DataFetchHandler(data,this.socket,this.socketContext);
            this.addRequestHandler(dataFetchHandler);
            await dataFetchHandler.start(callback);
        } catch (error) {
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
            return;
        }
       
    }

     onUploadData = async (request:StartUploadRequest, callback:(response:Response)=>void): Promise<void>  => {

        if(!isAuthenticatedContext(this.socketContext)) {
            callback(new ErrorResponse("Not authenticated", SocketError.NOT_AUTHORIZED));
            return;
        }

        try {
            const uploadRequestHandler = new DataUploadHandler(request,this.socket,this.socketContext as AuthenticatedSocketContext,this.distributedLockingService);

            this.addRequestHandler(uploadRequestHandler);
        
            await uploadRequestHandler.start(callback);
    
        } catch (error) {
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
            return;
        }
    }

    onGetSchemaInfo = async (request:SchemaInfoRequest, callback:(response:Response)=>void): Promise<void>  => {

        const packageEntity = await this.socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: request.identifier});

        const hasPermission = await hasPackageEntityPermissions(this.socketContext,packageEntity,Permission.VIEW);

        if(!hasPermission) {
            callback(new ErrorResponse("Not authorized", SocketError.NOT_AUTHORIZED));
            return;
        };

       const response = await SchemaInfoHandler.handle(this.socketContext,request);

        callback(response);
    };


    addRequestHandler(handler:RequestHandler):void {

        handler.on("stopped",()=> {
            this.requestHandlers = this.requestHandlers.filter(handler => handler !== handler);
        });

        this.requestHandlers.push(handler);        
    }

    onSetStreamActiveBatches = async (request:SetStreamActiveBatchesRequest, callback:(response:Response)=>void): Promise<void> => {

        if(!isAuthenticatedContext(this.socketContext)) {
            callback(new ErrorResponse("Not authenticated", SocketError.NOT_AUTHORIZED));
            return;
        }

        try {
            const uploadRequestHandler = new SetActiveBatchesHandler(request,this.socket,this.socketContext as AuthenticatedSocketContext);

            this.addRequestHandler(uploadRequestHandler);
        
            await uploadRequestHandler.start(callback);
    
        } catch (error) {
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
            return;
        }



    }

}

export async function checkPackagePermission(socket: SocketIO.Socket, socketContext: SocketContext, callback: (response:Response) => void, schemaIdentifier:StreamIdentifier, permission:Permission):Promise<boolean> {

    let packageEntity: PackageEntity;
    try {
        packageEntity = await socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({
            identifier: schemaIdentifier
        })
    } catch (error) {
        if(error.message.includes("_NOT_FOUND")) {
            callback(new ErrorResponse("PACKAGE_OR_CATALOG_NOT_FOUND", SocketError.NOT_FOUND));
        } else {
            callback(new ErrorResponse(error.message, SocketError.SERVER_ERROR));
        }
        return false;
    }

    const hasPermissions = await hasPackageEntityPermissions(socketContext, packageEntity, permission);

    if (!hasPermissions) {
        const response: ErrorResponse = new ErrorResponse("NOT_AUTHORIZED: You don't have  " + permission + " permission to the package " + schemaIdentifier.catalogSlug + "/" + schemaIdentifier.packageSlug,SocketError.NOT_AUTHORIZED)
        callback(response);
        return false;
    }


    return true;
}
