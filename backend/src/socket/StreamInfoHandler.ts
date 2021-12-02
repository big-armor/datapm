import { SocketResponseType, StreamInfoRequest, StreamInfoResponse } from "datapm-lib";
import { Socket } from "socket.io";
import { SocketContext } from "../context";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { LocalDataStorageService } from "../storage/data/data-storage";

export module StreamInfoHandler {

    const dataStorage = LocalDataStorageService.INSTANCE;

    export async function handle(streamContext: SocketContext, streamInfo: StreamInfoRequest): Promise<StreamInfoResponse> {

        const dataBatch = await streamContext.connection.getCustomRepository(DataBatchRepository).findDefaultBatchOrFail({ identifier: streamInfo.streamIdentifier});

        return {
            activeBatch: dataBatch.batch,
            responseType: SocketResponseType.STREAM_INFO,
            streamIdentifier: streamInfo.streamIdentifier,
        }
    }
}