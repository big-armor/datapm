import {
    DataAcknowledge,
    DataSend,
    DataStop,
    DataStopAcknowledge,
    DPMConfiguration,
    ErrorResponse,
    ProxyFetchRequestType,
    ProxyFetchResponse,
    OpenFetchProxyChannelRequest,
    OpenFetchProxyChannelResponse,
    PackageStreamsRequest,
    PackageStreamsResponse,
    RecordContext,
    SocketEvent,
    SocketResponseType,
    StartProxyFetchRequest,
    StreamState,
    TimeoutPromise,
    UpdateMethod
} from "datapm-lib";
import { SemVer } from "semver";
import { Socket } from "socket.io-client";
import { PassThrough } from "stream";
import { Maybe } from "../../../util/Maybe";
import { InspectionResults, Source, StreamSetPreview, StreamSummary } from "../../Source";
import { connectSocket } from "./DataPMRepository";
import { TYPE } from "./DataPMConnectorDescription";
import { JobContext } from "../../../task/JobContext";
import { getPackageFromUrl } from "../../../util/PackageContext";

export class DataPMSource implements Source {
    socket: Socket;

    sourceType(): string {
        return TYPE;
    }

    async inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<InspectionResults> {
        const url = connectionConfiguration.url + "/" + configuration.catalogSlug + "/" + configuration.packageSlug;

        const packageFileWithContext = await getPackageFromUrl(jobContext, url, "modified");

        const socket = await this.connectSocket(jobContext, connectionConfiguration, credentialsConfiguration);

        const packageStreamsResponse = await new TimeoutPromise<PackageStreamsResponse>(5000, (resolve, reject) => {
            socket.emit(
                SocketEvent.SCHEMA_INFO_REQUEST,
                new PackageStreamsRequest({
                    registryUrl: connectionConfiguration.url as string,
                    catalogSlug: configuration.catalogSlug as string,
                    packageSlug: configuration.packageSlug as string,
                    majorVersion: new SemVer(packageFileWithContext.packageFile.version).major
                }),
                (response: PackageStreamsResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        reject(response);
                    } else {
                        resolve(response as PackageStreamsResponse);
                    }
                }
            );
        });

        return {
            configuration,
            defaultDisplayName: packageFileWithContext.packageFile.displayName,
            source: this,
            streamSetPreviews: Object.keys(packageStreamsResponse.batchesBySchema).map<StreamSetPreview>(
                (schemaTitle) => {
                    return {
                        slug: schemaTitle,
                        configuration: {}, // TODO needed?
                        supportedUpdateMethods: [UpdateMethod.APPEND_ONLY_LOG, UpdateMethod.BATCH_FULL_SET],
                        expectedRecordsTotal: packageStreamsResponse.batchesBySchema[schemaTitle].reduce(
                            (acc, batch) => {
                                return acc + batch.highestOffset;
                            },
                            0
                        ),
                        streamSummaries: packageStreamsResponse.batchesBySchema[schemaTitle].map<StreamSummary>(
                            (batch) => {
                                return {
                                    name:
                                        batch.batchIdentifier.sourceType +
                                        "-" +
                                        batch.batchIdentifier.sourceSlug +
                                        "-" +
                                        batch.batchIdentifier.streamSetSlug +
                                        "-" +
                                        batch.batchIdentifier.streamSlug,
                                    expectedTotalRawBytes: batch.highestOffset,
                                    updateHash: batch.batchIdentifier + "-" + batch.updatedAt.toISOString(),
                                    updateMethod: batch.updateMethod,
                                    openStream: async (streamState: Maybe<StreamState>) => {
                                        const socket = await this.connectSocket(
                                            jobContext,
                                            connectionConfiguration,
                                            credentialsConfiguration
                                        );

                                        const openChannelResponse = await new TimeoutPromise<
                                            OpenFetchProxyChannelResponse
                                        >(5000, async (resolve, reject) => {
                                            socket.emit(
                                                SocketEvent.OPEN_FETCH_CHANNEL,
                                                new OpenFetchProxyChannelRequest(batch.batchIdentifier),
                                                (response: OpenFetchProxyChannelResponse | ErrorResponse) => {
                                                    if (response.responseType === SocketResponseType.ERROR) {
                                                        reject(response);
                                                    } else {
                                                        resolve(response as OpenFetchProxyChannelResponse);
                                                    }
                                                }
                                            );
                                        });

                                        const duplex = new PassThrough({
                                            objectMode: true
                                        });

                                        socket.on(
                                            openChannelResponse.channelName,
                                            async (
                                                dataOrError: DataSend | DataStop | ErrorResponse,
                                                callback?: (response: ProxyFetchResponse | ErrorResponse) => void
                                            ) => {
                                                if (
                                                    (dataOrError as ErrorResponse).responseType ===
                                                    SocketResponseType.ERROR
                                                ) {
                                                    // TODO provide context to alert of errors
                                                    return;
                                                }

                                                const data = dataOrError as DataSend | DataStop;

                                                if (data.requestType === ProxyFetchRequestType.STOP) {
                                                    duplex.end();
                                                    socket.off(openChannelResponse.channelName);
                                                    callback && callback(new DataStopAcknowledge());
                                                } else {
                                                    const dataSend = data as DataSend;

                                                    for (const record of dataSend.records) {
                                                        const recordContext: RecordContext = {
                                                            record: record.record,
                                                            schemaSlug: batch.batchIdentifier.schemaTitle,
                                                            offset: record.offset,
                                                            receivedDate: new Date()
                                                        };
                                                        const okToContinue = duplex.push(recordContext);

                                                        if (!okToContinue) {
                                                            await new TimeoutPromise<void>(60000, (resolve) => {
                                                                duplex.once("drain", resolve);
                                                            });
                                                        }
                                                    }
                                                    callback && callback(new DataAcknowledge());
                                                }
                                            }
                                        );

                                        let offSet = 0;

                                        if (streamState) {
                                            const schemaState =
                                                streamState.schemaStates[batch.batchIdentifier.schemaTitle];

                                            if (schemaState.lastOffset != null) {
                                                offSet = schemaState.lastOffset;
                                            }
                                        }
                                        socket.emit(
                                            openChannelResponse.channelName,
                                            new StartProxyFetchRequest(offSet)
                                        );

                                        return {
                                            stream: duplex
                                        };
                                    }
                                };
                            }
                        )
                    };
                }
            )
        };
    }

    async connectSocket(
        jobContext: JobContext,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<Socket> {
        if (this.socket != null && this.socket.connected) {
            return this.socket;
        }

        return connectSocket(jobContext, connectionConfiguration, credentialsConfiguration);
    }
}
