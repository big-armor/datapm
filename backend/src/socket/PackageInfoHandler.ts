import { SocketResponseType, PackageVersionInfoRequest, SchemaInfoResponse, PackageVersionInfoResponse, StreamSetState } from "datapm-lib";
import { SocketContext } from "../context";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { VersionRepository } from "../repository/VersionRepository";
import { DataStorageService } from "../storage/data/data-storage";

export module PackageInfoHandler {

    export async function handle(streamContext: SocketContext, packageInfoRequest: PackageVersionInfoRequest): Promise<PackageVersionInfoResponse> {

        const packageEntity = await streamContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: packageInfoRequest.identifier});

        const latestVersion = await streamContext.connection.getCustomRepository(VersionRepository).findLatestVersionByMajorVersion({identifier: packageInfoRequest.identifier, majorVersion: packageInfoRequest.identifier.majorVersion});

        if(latestVersion == null) {
            throw new Error("VERSION_NOT_FOUND");
        }

        const dataBatches = await streamContext.connection.getCustomRepository(DataBatchRepository).findDefaultBatchesForPackage(packageEntity.id,packageInfoRequest.identifier.majorVersion);

        if(dataBatches.length == 0) {
            throw new Error("NO_DATA_FOUND");
        }

        return {
            responseType: SocketResponseType.PACKAGE_VERSION_DATA_INFO_RESPONSE,
            identifier: packageInfoRequest.identifier,
            state: {
                packageVersion: latestVersion.majorVersion + "." + latestVersion.minorVersion + "." + latestVersion.patchVersion,
                timestamp: dataBatches.map(batch => batch.updatedAt).sort()[0],
                streamSets: dataBatches.reduce<Record<string, StreamSetState>>((map,batch) => {

                    if(map[batch.streamSetSlug] == undefined){
                        map[batch.streamSetSlug] = {
                            streamStates: {}
                        };
                    }

                    if(map[batch.streamSetSlug].streamStates[batch.streamSlug] == null) {
                        map[batch.streamSetSlug].streamStates[batch.streamSlug] = {
                            schemaStates: {}
                        }
                    }

                    map[batch.streamSetSlug].streamStates[batch.streamSlug].schemaStates[batch.schemaTitle] = {
                        lastOffset: batch.lastOffset
                    }

                    return map
                },{})

            }

        }

    }
}