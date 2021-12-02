import { SocketContext } from "../context";
import { checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from 'socket.io';
import { Permission } from "../generated/graphql";
import { EventEmitter } from "stream";
import { FetchRequest, streamIdentifierToChannelName } from "datapm-lib";
import { PackageRepository } from "../repository/PackageRepository";

export class DataFetchHandler extends EventEmitter implements RequestHandler {

    constructor(private fetchRequest: FetchRequest, private socket: SocketIO.Socket, private socketContext:SocketContext) {
        super();
    }


    async start(): Promise<void> {
        const channelName = streamIdentifierToChannelName(this.fetchRequest.streamIdentifier);
       
        if(!await checkPackagePermission(this.socket, this.socketContext, this.fetchRequest.streamIdentifier, Permission.VIEW)) {
            this.stop();
            return;
        }

        const packageEntity = await this.socketContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: this.fetchRequest.streamIdentifier});


        // Send start message, wait for start acknowledgement

        // Connect to the stream, read and send

        // Read the stream from the offset


        this.socket.emit(channelName, "test");
    }
    async stop(): Promise<void> {
        
    }

}
