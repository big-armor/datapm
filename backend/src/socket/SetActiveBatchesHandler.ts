import {
    BatchRepositoryIdentifier,
    Response,
    SetStreamActiveBatchesRequest,
    SetStreamActiveBatchesResponse
} from "datapm-lib";
import { EventEmitter } from "stream";
import { checkPackagePermission, RequestHandler } from "./SocketHandler";
import SocketIO from "socket.io";
import { AuthenticatedSocketContext } from "../context";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { ActivityLogEventType, Permission } from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";

export class SetActiveBatchesHandler extends EventEmitter implements RequestHandler {
    constructor(
        private request: SetStreamActiveBatchesRequest,
        private socket: SocketIO.Socket,
        private socketContext: AuthenticatedSocketContext
    ) {
        super();
    }

    async start(callback: (response: Response) => void): Promise<void> {
        const batchIdentifiers = this.request.batchIdentifiers;

        await this.socketContext.connection.transaction(async (entityManager) => {
            await batchIdentifiers.asyncForEach(async (batchIdentifier: BatchRepositoryIdentifier) => {
                const packageEntity = await entityManager
                    .getCustomRepository(PackageRepository)
                    .findPackageOrFail({ identifier: batchIdentifier });

                await checkPackagePermission(
                    this.socket,
                    this.socketContext,
                    callback,
                    batchIdentifier,
                    Permission.EDIT
                );

                const dataBatchEntity = await this.socketContext.connection
                    .getCustomRepository(DataBatchRepository)
                    .findBatchOrFail(
                        packageEntity.id,
                        batchIdentifier.majorVersion,
                        batchIdentifier.sourceType,
                        batchIdentifier.sourceSlug,
                        batchIdentifier.streamSetSlug,
                        batchIdentifier.streamSlug,
                        batchIdentifier.schemaTitle,
                        batchIdentifier.batch
                    );

                const currentlyActiveBatch = await entityManager
                    .getCustomRepository(DataBatchRepository)
                    .findDefaultBatch({ identifier: batchIdentifier });

                if (currentlyActiveBatch) {
                    currentlyActiveBatch.default = false;
                    await entityManager.save(currentlyActiveBatch);
                }

                dataBatchEntity.default = true;

                await entityManager.save(dataBatchEntity);

                await createActivityLog(this.socketContext.connection, {
                    userId: this.socketContext.me.id,
                    eventType: ActivityLogEventType.DATA_BATCH_ACTIVE_CHANGED,
                    targetPackageId: packageEntity.id,
                    targetDataBatchId: dataBatchEntity.id,
                    additionalProperties: {
                        priorActiveBatchId: currentlyActiveBatch?.id,
                        priorActiveBatch: currentlyActiveBatch?.batch
                    }
                });
            });
        });

        callback(new SetStreamActiveBatchesResponse(batchIdentifiers));
    }

    stop(reason: "server" | "client" | "disconnect"): Promise<void> {
        throw new Error("Method not implemented.");
    }
}
