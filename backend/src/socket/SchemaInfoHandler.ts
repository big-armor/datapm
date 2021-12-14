import { SocketResponseType, SchemaInfoRequest, SchemaInfoResponse } from "datapm-lib";
import { Socket } from "socket.io";
import { SocketContext } from "../context";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { DataStorageService } from "../storage/data/data-storage";

export module SchemaInfoHandler {

    const dataStorage = DataStorageService.INSTANCE;

    export async function handle(streamContext: SocketContext, streamInfo: SchemaInfoRequest): Promise<SchemaInfoResponse> {

        const packageEntity = await streamContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: streamInfo.identifier});

        const dataBatches = await streamContext.connection.getCustomRepository(DataBatchRepository).findDefaultBatchesForSchema(packageEntity.id,streamInfo.identifier.majorVersion,streamInfo.identifier.schemaTitle);

        return {
            identifier: streamInfo.identifier,
            streams: dataBatches.map(batch => {
                return {
                    batchIdentifier: {
                        ...streamInfo.identifier,
                        streamSlug: batch.streamSlug,
                        batch: batch.batch
                    },
                    highestOffset: batch.lastOffset

                }
            }),
            responseType: SocketResponseType.SCHEMA_INFO_RESPONSE,
        }
    }
}