import {
    SocketResponseType,
    PackageStreamsRequest,
    PackageStreamsResponse,
    BatchRepositoryIdentifier,
    BatchesBySchema
} from "datapm-lib";
import { SocketContext } from "../context";
import { DataBatchEntity } from "../entity/DataBatchEntity";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { getEnvVariable } from "../util/getEnvVariable";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace SchemaInfoHandler {
    export async function handle(
        streamContext: SocketContext,
        packageStreamsRequest: PackageStreamsRequest
    ): Promise<PackageStreamsResponse> {
        const packageEntity = await streamContext.connection
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: packageStreamsRequest.identifier });

        const dataBatches = await streamContext.connection
            .getCustomRepository(DataBatchRepository)
            .findDefaultBatchesForPackage(packageEntity.id, packageStreamsRequest.identifier.majorVersion, [
                "package",
                "package.catalog"
            ]);

        return {
            identifier: packageStreamsRequest.identifier,
            batchesBySchema: dataBatches.reduce((acc: BatchesBySchema, batch) => {
                if (acc[batch.schemaTitle] == null) {
                    acc[batch.schemaTitle] = [];
                }
                acc[batch.schemaTitle].push({
                    batchIdentifier: entityToIdentifier(batch),
                    highestOffset: batch.lastOffset,
                    updatedAt: batch.updatedAt,
                    updateMethod: batch.updateMethod
                });
                return acc;
            }, {}),
            responseType: SocketResponseType.SCHEMA_INFO_RESPONSE
        };
    }

    function entityToIdentifier(entity: DataBatchEntity): BatchRepositoryIdentifier {
        return {
            registryUrl: getEnvVariable("REGISTRY_URL") as string,
            catalogSlug: entity.package.catalog.slug,
            packageSlug: entity.package.slug,
            majorVersion: entity.majorVersion,
            schemaTitle: entity.schemaTitle,
            sourceType: entity.sourceType,
            sourceSlug: entity.sourceSlug,
            streamSetSlug: entity.streamSetSlug,
            streamSlug: entity.streamSlug,
            batch: entity.batch
        };
    }
}
