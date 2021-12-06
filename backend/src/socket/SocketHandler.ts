import {Response, ErrorResponse, SocketError, SocketEvent, StreamIdentifier, streamIdentifierToChannelName, StartUploadRequest, StartUploadResponse, StreamInfoRequest, FetchRequest, SetStreamActiveBatchesRequest } from 'datapm-lib';
import EventEmitter from 'events';
import { SemVer } from 'semver';
import SocketIO from 'socket.io';
import { AuthenticatedSocketContext, SocketContext } from '../context';
import { Permission } from '../generated/graphql';
import { PackageRepository } from '../repository/PackageRepository';
import { hasPackageEntityPermissions } from '../resolvers/UserPackagePermissionResolver';
import { DistributedLockingService } from '../service/distributed-locking-service';
import { isAuthenticatedContext } from '../util/contextHelpers';
import { DataUploadHandler } from './DataUploadHandler';
import { SetActiveBatchesHandler } from './SetActiveBatchesHandler';
import { StreamInfoHandler } from './StreamInfoHandler';

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

        socket.on(SocketEvent.FETCH_DATA_REQUEST.toString(), this.onFetchData);
        socket.on(SocketEvent.START_DATA_UPLOAD.toString(), this.onUploadData);
        socket.on(SocketEvent.GET_STREAM_INFO.toString(), this.onGetStreamInfo);
        socket.on(SocketEvent.SET_STREAM_ACTIVE_BATCHES.toString(), this.onSetStreamActiveBatches);

        socket.on('disconnect', this.onDisconnect);
        socket.on('error', () => console.log("Error"));

        socket.emit(SocketEvent.READY.toString());
    }

    onDisconnect = ():void =>  {
        this.socket.on(SocketEvent.FETCH_DATA_REQUEST.toString(), this.onFetchData);
        this.socket.on(SocketEvent.START_DATA_UPLOAD.toString(), this.onUploadData);
        this.socket.on(SocketEvent.GET_STREAM_INFO.toString(), this.onGetStreamInfo);
    };

     onFetchData = async (data:FetchRequest,callback:(response:Response)=>void):Promise<void> => {

        return new Promise((resolve) => {
            resolve();
        })
       
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

    onGetStreamInfo = async (request:StreamInfoRequest, callback:(response:Response)=>void): Promise<void>  => {

        const packageEntity = await this.socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: request.streamIdentifier});

        if(!hasPackageEntityPermissions(this.socketContext,packageEntity,Permission.VIEW)) {
            callback(new ErrorResponse("Not authorized", SocketError.NOT_AUTHORIZED));
            return;
        };

       const response = await StreamInfoHandler.handle(this.socketContext,request);

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


export async function checkPackagePermission(socket: SocketIO.Socket, socketContext: SocketContext, schemaIdentifier:StreamIdentifier, permission:Permission):Promise<boolean> {

    const packageEntity = await socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({
        identifier: schemaIdentifier
    })

    const hasPermissions = await hasPackageEntityPermissions(socketContext, packageEntity, permission);

    if (!hasPermissions) {
        const channelName = streamIdentifierToChannelName(schemaIdentifier);
        const response: ErrorResponse = new ErrorResponse("You don't have  " + permission + " permission to the package " + schemaIdentifier.catalogSlug + "/" + schemaIdentifier.packageSlug,SocketError.NOT_AUTHORIZED)
        socket.emit(channelName, response);
        return false;
    }

    return true;
}