import { BatchIdentifier, Response, SetStreamActiveBatchesRequest, SetStreamActiveBatchesResponse } from "datapm-lib";
import { EventEmitter } from "stream";
import { checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from 'socket.io';
import { AuthenticatedSocketContext } from "../context";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { Permission } from "../generated/graphql";

export class SetActiveBatchesHandler extends EventEmitter implements RequestHandler{


    constructor(
        private request: SetStreamActiveBatchesRequest,
        private socket: SocketIO.Socket,
        private socketContext:AuthenticatedSocketContext
    ) {
        super();
    }

    async start(callback: (response: Response) => void): Promise<void> {
        
        const batchIdentifiers = this.request.batchIdentifiers;

        await this.socketContext.connection.transaction(async (entityManager) => {

            await batchIdentifiers.asyncForEach(async (batchIdentifier:BatchIdentifier) => {
              
                const packageEntity = await entityManager.getCustomRepository(PackageRepository).findPackageOrFail({identifier: batchIdentifier});

                await checkPackagePermission(this.socket, this.socketContext, callback, batchIdentifier, Permission.EDIT);

                const dataBatchEntity = await entityManager.getCustomRepository(DataBatchRepository).findBatchOrFail(
                        packageEntity.id,
                        batchIdentifier.majorVersion,
                        batchIdentifier.schemaTitle,
                        batchIdentifier.streamSlug,
                        batchIdentifier.batch
                    );

                const currentlyActiveBatch = await entityManager.getCustomRepository(DataBatchRepository).findDefaultBatch({identifier: batchIdentifier});
                
                if(currentlyActiveBatch) {
                    currentlyActiveBatch.default = false;
                    await entityManager.save(currentlyActiveBatch);
                }

                dataBatchEntity.default = true;

                await entityManager.save(dataBatchEntity);

            });


        });


        callback(new SetStreamActiveBatchesResponse(batchIdentifiers))

    }
    stop(reason: "server" | "client" | "disconnect"): Promise<void> {
        throw new Error("Method not implemented.");
    }

}