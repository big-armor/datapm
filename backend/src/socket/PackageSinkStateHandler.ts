import { SocketResponseType, PackageSinkStateRequest, PackageSinkStateResponse, StreamSetState, ErrorResponse, SocketError } from "datapm-lib";
import { SocketContext } from "../context";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { VersionRepository } from "../repository/VersionRepository";

export module PackageSinkStateHandler {

    export async function handle(streamContext: SocketContext, packageInfoRequest: PackageSinkStateRequest): Promise<PackageSinkStateResponse | ErrorResponse> {

        const packageEntity = await streamContext.connection.getCustomRepository(PackageRepository).findPackageOrFail({identifier: packageInfoRequest.identifier});

        const latestVersion = await streamContext.connection.getCustomRepository(VersionRepository).findLatestVersionByMajorVersion({identifier: packageInfoRequest.identifier, majorVersion: packageInfoRequest.identifier.majorVersion});

        if(latestVersion == null) {
            return new ErrorResponse('VERSION_NOT_FOUND', SocketError.NOT_FOUND);
        }

        const dataBatches = await streamContext.connection.getCustomRepository(DataBatchRepository).findDefaultBatchesForPackage(packageEntity.id,packageInfoRequest.identifier.majorVersion);

        if(dataBatches.length == 0) {
            return new ErrorResponse('DATA_NOT_FOUND', SocketError.NOT_FOUND);
        }

        return {
            responseType: SocketResponseType.PACKAGE_VERSION_SINK_STATE_RESPONSE,
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