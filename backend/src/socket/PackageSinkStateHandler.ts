import {
    SocketResponseType,
    PackageSinkStateRequest,
    PackageSinkStateResponse,
    StreamSetState,
    ErrorResponse,
    SocketError
} from "datapm-lib";
import { AuthenticatedContext, SocketContext } from "../context";
import { ActivityLogEventType } from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { DataBatchRepository } from "../repository/DataBatchRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { VersionRepository } from "../repository/VersionRepository";

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace PackageSinkStateHandler {
    export async function handle(
        streamContext: SocketContext,
        packageInfoRequest: PackageSinkStateRequest
    ): Promise<PackageSinkStateResponse | ErrorResponse> {
        const packageEntity = await streamContext.connection
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: packageInfoRequest.identifier });

        const latestVersion = await streamContext.connection
            .getCustomRepository(VersionRepository)
            .findLatestVersionByMajorVersion({
                identifier: packageInfoRequest.identifier,
                majorVersion: packageInfoRequest.identifier.majorVersion
            });

        if (latestVersion == null) {
            return new ErrorResponse("VERSION_NOT_FOUND", SocketError.NOT_FOUND);
        }

        const dataBatches = await streamContext.connection
            .getCustomRepository(DataBatchRepository)
            .findDefaultBatchesForPackage(packageEntity.id, packageInfoRequest.identifier.majorVersion);

        if (dataBatches.length === 0) {
            return new ErrorResponse("DATA_NOT_FOUND", SocketError.NOT_FOUND);
        }

        const authenicatedContext =
            (streamContext as AuthenticatedContext).me != null ? (streamContext as AuthenticatedContext) : null;

        await createActivityLog(streamContext.connection, {
            userId: authenicatedContext?.me.id,
            eventType: ActivityLogEventType.DATA_SINK_STATE_REQUESTED,
            targetPackageId: packageEntity.id,
            additionalProperties: {
                majorVersion: packageInfoRequest.identifier.majorVersion
            }
        });

        return {
            responseType: SocketResponseType.PACKAGE_VERSION_SINK_STATE_RESPONSE,
            identifier: packageInfoRequest.identifier,
            state: {
                packageVersion:
                    latestVersion.majorVersion + "." + latestVersion.minorVersion + "." + latestVersion.patchVersion,
                timestamp: dataBatches.map((batch) => batch.updatedAt).sort()[0],
                streamSets: dataBatches.reduce<Record<string, StreamSetState>>((map, batch) => {
                    if (map[batch.streamSetSlug] === undefined) {
                        map[batch.streamSetSlug] = {
                            streamStates: {}
                        };
                    }

                    if (map[batch.streamSetSlug].streamStates[batch.streamSlug] == null) {
                        map[batch.streamSetSlug].streamStates[batch.streamSlug] = {
                            schemaStates: {}
                        };
                    }

                    const streamState = map[batch.streamSetSlug].streamStates[batch.streamSlug];

                    streamState.schemaStates[batch.schemaTitle] = {
                        lastOffset: batch.lastOffset
                    };

                    if (streamState.streamOffset === undefined || streamState.streamOffset < batch.lastOffset) {
                        streamState.streamOffset = batch.lastOffset;
                    }

                    return map;
                }, {})
            }
        };
    }
}
