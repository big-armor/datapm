import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreatePackageDocument,
    PackageDocument,
    UpdateCatalogDocument,
    UpdatePackageDocument,
    CreateVersionDocument,
    LoginDocument,
    MovePackageDocument,
    CreateCatalogDocument,
    ActivityLogEventType
} from "./registry-client";
import {
    createAnonymousClient,
    createAnonymousStreamingClient,
    createAuthenicatedStreamingClient,
    createUser
} from "./test-utils";
import {
    parsePackageFileJSON,
    loadPackageFileFromDisk,
    PublishMethod,
    SocketEvent,
    StartFetchRequest,
    ErrorResponse,
    StartFetchResponse,
    SocketResponseType,
    SocketError,
    StartUploadRequest,
    UploadDataRequest,
    UploadDataResponse,
    StartUploadResponse,
    UploadResponseType,
    UploadStopRequest,
    UploadStopResponse,
    PackageStreamsRequest,
    PackageStreamsResponse,
    DataSend,
    DataStop,
    ProxyFetchRequestType,
    SetStreamActiveBatchesResponse,
    SetStreamActiveBatchesRequest,
    ProxyFetchResponse,
    DataAcknowledge,
    DataStopAcknowledge,
    DPMRecord,
    DataRecordContext,
    PackageSinkStateRequest,
    PackageSinkStateResponse,
    UpdateMethod,
    OpenFetchProxyChannelRequest,
    OpenFetchProxyChannelResponse,
    StartProxyFetchRequest
} from "datapm-lib";
import { describe, it } from "mocha";
import { Socket } from "socket.io-client";
import { ActivityLogLine, findActivityLogLine, serverLogLines } from "./setup";

/** Tests when the registry is used as a repository for the data of a package */
describe("Data Store on Registry", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    let userAToken = "Bearer ";
    let userBToken = "Bearer ";

    let anonymousStreamingClient: Socket;
    let userAStreamingClient: Socket;
    let userBStreamingClient: Socket;

    after(async () => {
        if (anonymousStreamingClient) {
            anonymousStreamingClient.disconnect();
        }

        if (userAStreamingClient) {
            userAStreamingClient.disconnect();
        }

        if (userBStreamingClient) {
            userBStreamingClient.disconnect();
        }
    });

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-registry-data",
            "testA-registry-data@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-registry-data",
            "testB-registry-data@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);

        const userALogin = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testA-registry-data",
                password: "passwordA!"
            }
        });

        if (!userALogin.data?.login) {
            throw new Error("Authentication didn't work for user A");
        }

        const userBLogin = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testB-registry-data",
                password: "passwordB!"
            }
        });

        if (!userBLogin.data?.login) {
            throw new Error("Authentication didn't work for user B");
        }

        userAToken += userALogin.data.login;
        userBToken += userBLogin.data.login;
    });

    it("Create a test package for storing data with no authentication", async function () {
        const response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-registry-data",
                    packageSlug: "simple",
                    displayName: "Simple",
                    description: "Test of simple values"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-registry-data");
        expect(response.data?.createPackage.description).to.equal("Test of simple values");
        expect(response.data?.createPackage.displayName).to.equal("Simple");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-registry-data");
        expect(response.data?.createPackage.identifier.packageSlug).to.equal("simple");
        expect(response.data?.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish first version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/data-files/simple/simple.datapm.json");

        packageFileContents.registries = [
            {
                catalogSlug: "testA-registry-data",
                publishMethod: PublishMethod.SCHEMA_AND_DATA,
                url: "http://localhost:4200"
            }
        ];

        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-registry-data",
                    packageSlug: "simple"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.createVersion.author?.username).equal("testA-registry-data");

        const responsePackageFileContents = response.data?.createVersion.packageFile;

        const responsePackageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(responsePackageFile.readmeMarkdown).includes("Simple");
        expect(responsePackageFile.licenseMarkdown).includes("License not defined");

        if (responsePackageFile.registries == null) {
            throw new Error("Registries not defined");
        }
        expect(responsePackageFile.registries[0].publishMethod).equal(PublishMethod.SCHEMA_AND_DATA);
        expect(responsePackageFile.sources[0].type).equal("datapm");
        expect(responsePackageFile.sources[0].streamSets[0].slug).equal("simple");
    });

    it("Connect to websocket for data uploads", async function () {
        anonymousStreamingClient = await createAnonymousStreamingClient();

        userAStreamingClient = await createAuthenicatedStreamingClient(
            "testA-registry-data@test.datapm.io",
            "passwordA!"
        );

        userBStreamingClient = await createAuthenicatedStreamingClient(
            "testB-registry-data@test.datapm.io",
            "passwordB!"
        );
    });

    it("Anonymous catalog not found", async function () {
        let notFoundErrorRecieved = false;

        await new Promise<void>((resolve, reject) => {
            anonymousStreamingClient.emit(
                SocketEvent.OPEN_FETCH_CHANNEL,
                new OpenFetchProxyChannelRequest({
                    catalogSlug: "not-found",
                    packageSlug: "simple",
                    majorVersion: 1,
                    registryUrl: "http://localhost:4000",
                    sourceType: "test",
                    sourceSlug: "test",
                    streamSetSlug: "simple",
                    streamSlug: "simple",
                    schemaTitle: "simple",
                    batch: 1
                }),
                (response: StartFetchResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        const error = response as ErrorResponse;
                        if (error.errorType === SocketError.NOT_FOUND) {
                            notFoundErrorRecieved = true;
                        }
                        resolve();
                    } else {
                        reject(new Error("Expected error"));
                    }
                }
            );
        });

        expect(notFoundErrorRecieved).to.equal(true);
    });

    it("Package not found", async function () {
        let notFoundErrorRecieved = false;

        await new Promise<void>((resolve, reject) => {
            anonymousStreamingClient.emit(
                SocketEvent.OPEN_FETCH_CHANNEL,
                new OpenFetchProxyChannelRequest({
                    catalogSlug: "testA-registry-data",
                    packageSlug: "not-correct",
                    majorVersion: 1,
                    registryUrl: "http://localhost:4000",
                    sourceType: "test",
                    sourceSlug: "test",
                    streamSetSlug: "simple",
                    streamSlug: "simple",
                    schemaTitle: "simple",
                    batch: 1
                }),
                (response: StartFetchResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        const error = response as ErrorResponse;
                        if (error.errorType === SocketError.NOT_FOUND) {
                            notFoundErrorRecieved = true;
                        }
                        resolve();
                    } else {
                        reject(new Error("Expected error"));
                    }
                }
            );
        });

        expect(notFoundErrorRecieved).to.equal(true);
    });

    it("Anonymous not authorized to access", async function () {
        let notAuthorizedErrorRecieved = false;

        await new Promise<void>((resolve, reject) => {
            anonymousStreamingClient.emit(
                SocketEvent.OPEN_FETCH_CHANNEL,
                new OpenFetchProxyChannelRequest({
                    catalogSlug: "testA-registry-data",
                    packageSlug: "simple",
                    majorVersion: 1,
                    registryUrl: "http://localhost:4000",
                    sourceType: "test",
                    sourceSlug: "test",
                    streamSetSlug: "simple",
                    streamSlug: "simple",
                    schemaTitle: "simple",
                    batch: 1
                }),
                (response: StartFetchResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        const error = response as ErrorResponse;
                        if (error.errorType === SocketError.NOT_AUTHORIZED) {
                            notAuthorizedErrorRecieved = true;
                        }
                        resolve();
                    } else {
                        reject(new Error("Expected not authorized error"));
                    }
                }
            );
        });

        expect(notAuthorizedErrorRecieved).to.equal(true);
    });

    it("User A can not upload data to a non-specified schema", async function () {
        const response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                SocketEvent.START_DATA_UPLOAD,
                new StartUploadRequest(
                    {
                        catalogSlug: "testA-registry-data",
                        packageSlug: "simple",
                        majorVersion: 1,
                        registryUrl: "http://localhost:4000",
                        sourceType: "test",
                        sourceSlug: "test",
                        streamSetSlug: "simple",
                        streamSlug: "simple",
                        schemaTitle: "wrong-schema"
                    },
                    true,
                    UpdateMethod.BATCH_FULL_SET
                ),
                (response: StartUploadResponse) => {
                    resolve(response);
                }
            );
        });

        expect(response.responseType).equal(SocketResponseType.ERROR);

        const uploadResponse: ErrorResponse = response as ErrorResponse;

        expect(uploadResponse.errorType).equal(SocketError.NOT_VALID);
        expect(uploadResponse.message).include("SCHEMA_NOT_VALID");
    });

    const recordZeroDate: Date = new Date();
    const recordZeroDateTime = new Date();
    const recordOneDate: Date = new Date();
    const recordOneDateTime = new Date();

    it("User A can upload data", async function () {
        const response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                SocketEvent.START_DATA_UPLOAD,
                new StartUploadRequest(
                    {
                        catalogSlug: "testA-registry-data",
                        packageSlug: "simple",
                        majorVersion: 1,
                        registryUrl: "http://localhost:4000",
                        sourceType: "test",
                        sourceSlug: "test",
                        streamSetSlug: "simple",
                        streamSlug: "simple",
                        schemaTitle: "simple"
                    },
                    true,
                    UpdateMethod.APPEND_ONLY_LOG
                ),
                (response: StartUploadResponse) => {
                    resolve(response);
                }
            );
        });

        expect(response.responseType).equal(SocketResponseType.START_DATA_UPLOAD_RESPONSE);

        const startResponse: StartUploadResponse = response as StartUploadResponse;

        expect(startResponse.batchIdentifier.registryUrl).equal("http://localhost:4000");
        expect(startResponse.batchIdentifier.catalogSlug).equal("testA-registry-data");
        expect(startResponse.batchIdentifier.majorVersion).equal(1);
        expect(startResponse.batchIdentifier.packageSlug).equal("simple");
        expect(startResponse.batchIdentifier.sourceType).equal("test");
        expect(startResponse.batchIdentifier.sourceSlug).equal("test");
        expect(startResponse.batchIdentifier.streamSetSlug).equal("simple");
        expect(startResponse.batchIdentifier.streamSlug).equal("simple");
        expect(startResponse.batchIdentifier.schemaTitle).equal("simple");
        expect(startResponse.batchIdentifier.batch).equal(1);

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.DATA_BATCH_UPLOAD_STARTED &&
                        activityLogLine.username === "testA-registry-data" &&
                        activityLogLine.targetPackageIdentifier === "testA-registry-data/simple"
                    );
                })
            )
        ).to.not.equal(undefined);

        const records: DataRecordContext[] = [
            {
                offset: 0,
                record: {
                    string: "Test string",
                    number: 3.1465,
                    boolean: true,
                    date: recordZeroDate,
                    dateTime: recordZeroDateTime,
                    stringNulls: null
                }
            },
            {
                offset: 1,
                record: {
                    string: "Another string",
                    number: 42,
                    boolean: true,
                    date: recordOneDate,
                    dateTime: recordOneDateTime,
                    stringNulls: "not a null"
                }
            }
        ];

        const uploadDataResponse = await new Promise<UploadDataResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                startResponse.channelName,
                new UploadDataRequest(records),
                (response: UploadDataResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        reject(new Error((response as ErrorResponse).message));
                    }

                    resolve(response as UploadDataResponse);
                }
            );
        });

        expect(uploadDataResponse.responseType).equal(UploadResponseType.UPLOAD_RESPONSE);

        const stopUploadResponse = await new Promise<UploadStopResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                startResponse.channelName,
                new UploadStopRequest(),
                (response: UploadStopResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        reject(new Error((response as ErrorResponse).message));
                    }

                    resolve(response as UploadStopResponse);
                }
            );
        });

        expect(stopUploadResponse.responseType).equal(UploadResponseType.UPLOAD_STOP_RESPONSE);

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.DATA_BATCH_UPLOAD_STOPPED &&
                        activityLogLine.username === "testA-registry-data" &&
                        activityLogLine.targetPackageIdentifier === "testA-registry-data/simple"
                    );
                })
            )
        ).to.not.equal(undefined);

        const updateDefaultResponse = await new Promise<SetStreamActiveBatchesResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                SocketEvent.SET_STREAM_ACTIVE_BATCHES,
                new SetStreamActiveBatchesRequest([
                    {
                        catalogSlug: "testA-registry-data",
                        packageSlug: "simple",
                        majorVersion: 1,
                        registryUrl: "http://localhost:4000",
                        sourceType: "test",
                        sourceSlug: "test",
                        streamSetSlug: "simple",
                        streamSlug: "simple",
                        schemaTitle: "simple",
                        batch: 1
                    }
                ]),
                (response: SetStreamActiveBatchesResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        reject(new Error((response as ErrorResponse).message));
                    }

                    resolve(response as SetStreamActiveBatchesResponse);
                }
            );
        });

        expect(updateDefaultResponse.responseType).equal(SocketResponseType.SET_STREAM_ACTIVE_BATCHES);

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.DATA_BATCH_ACTIVE_CHANGED &&
                        activityLogLine.username === "testA-registry-data" &&
                        activityLogLine.targetPackageIdentifier === "testA-registry-data/simple"
                    );
                })
            )
        ).to.not.equal(undefined);

        expect(updateDefaultResponse.batchIdentifiers[0].registryUrl).equal("http://localhost:4000");
        expect(updateDefaultResponse.batchIdentifiers[0].catalogSlug).equal("testA-registry-data");
        expect(updateDefaultResponse.batchIdentifiers[0].majorVersion).equal(1);
        expect(updateDefaultResponse.batchIdentifiers[0].packageSlug).equal("simple");
        expect(updateDefaultResponse.batchIdentifiers[0].sourceType).equal("test");
        expect(updateDefaultResponse.batchIdentifiers[0].sourceSlug).equal("test");
        expect(updateDefaultResponse.batchIdentifiers[0].streamSetSlug).equal("simple");
        expect(updateDefaultResponse.batchIdentifiers[0].streamSlug).equal("simple");
        expect(updateDefaultResponse.batchIdentifiers[0].schemaTitle).equal("simple");
        expect(updateDefaultResponse.batchIdentifiers[0].batch).equal(1);
    });

    /** Future strict mode 
     * 
     * it("User cannot upload data that doesn't match the sheet", async function () {


    });
    */

    it("User without any permission can not upload data", async function () {
        const response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userBStreamingClient.emit(
                SocketEvent.START_DATA_UPLOAD,
                new StartUploadRequest(
                    {
                        catalogSlug: "testA-registry-data",
                        packageSlug: "simple",
                        majorVersion: 1,
                        registryUrl: "http://localhost:4000",
                        sourceType: "test",
                        sourceSlug: "test",
                        streamSetSlug: "simple",
                        streamSlug: "simple",
                        schemaTitle: "simple"
                    },
                    true,
                    UpdateMethod.BATCH_FULL_SET
                ),
                (response: StartUploadResponse) => {
                    resolve(response);
                }
            );
        });

        expect(response.responseType).equal(SocketResponseType.ERROR);

        const errorResponse: ErrorResponse = response as ErrorResponse;
        expect(errorResponse.errorType).equal(SocketError.NOT_AUTHORIZED);
        expect(errorResponse.message).include("NOT_AUTHORIZED");
    });

    const downloadAndValidateData = async (socket: Socket, catalogSlug: string) => {
        const streamInfoResponse = await new Promise<PackageStreamsResponse | ErrorResponse>((resolve, reject) => {
            socket.emit(
                SocketEvent.SCHEMA_INFO_REQUEST,
                new PackageStreamsRequest({
                    catalogSlug,
                    packageSlug: "simple",
                    majorVersion: 1,
                    registryUrl: "http://localhost:4000"
                }),
                (response: PackageStreamsResponse | ErrorResponse) => {
                    resolve(response);
                }
            );
        });

        if (streamInfoResponse.responseType === SocketResponseType.ERROR) {
            console.log(JSON.stringify(streamInfoResponse));
        }

        expect(streamInfoResponse.responseType).equal(SocketResponseType.SCHEMA_INFO_RESPONSE);

        const packageStreamsResponse: PackageStreamsResponse = streamInfoResponse as PackageStreamsResponse;
        expect(packageStreamsResponse.identifier.registryUrl).equal("http://localhost:4000");
        expect(packageStreamsResponse.identifier.catalogSlug).equal(catalogSlug);
        expect(packageStreamsResponse.identifier.packageSlug).equal("simple");
        expect(packageStreamsResponse.identifier.majorVersion).equal(1);

        expect(packageStreamsResponse.batchesBySchema.simple.length).equal(1);

        expect(packageStreamsResponse.batchesBySchema.simple[0].batchIdentifier.batch).equal(1);
        expect(packageStreamsResponse.batchesBySchema.simple[0].batchIdentifier.sourceSlug).equal("test");
        expect(packageStreamsResponse.batchesBySchema.simple[0].batchIdentifier.streamSetSlug).equal("simple");
        expect(packageStreamsResponse.batchesBySchema.simple[0].batchIdentifier.streamSlug).equal("simple");
        expect(packageStreamsResponse.batchesBySchema.simple[0].highestOffset).equal(1);

        const response = await new Promise<OpenFetchProxyChannelResponse | ErrorResponse>((resolve, reject) => {
            socket.emit(
                SocketEvent.OPEN_FETCH_CHANNEL,
                new OpenFetchProxyChannelRequest(packageStreamsResponse.batchesBySchema.simple[0].batchIdentifier),
                (response: OpenFetchProxyChannelResponse) => {
                    resolve(response);
                }
            );
        });

        expect(response.responseType).equal(SocketResponseType.OPEN_FETCH_CHANNEL_RESPONSE);

        const openChannelResponse: OpenFetchProxyChannelResponse = response as OpenFetchProxyChannelResponse;

        expect(openChannelResponse.channelName).not.equal(undefined);

        const records: DataRecordContext[] = await new Promise<DataRecordContext[]>((resolve, reject) => {
            let records: DataRecordContext[] = [];

            socket.on(
                openChannelResponse.channelName,
                (event: DataSend | DataStop, callback?: (response: ProxyFetchResponse | ErrorResponse) => void) => {
                    if (event.requestType === ProxyFetchRequestType.DATA) {
                        records = records.concat((event as DataSend).records);
                        callback && callback(new DataAcknowledge());
                    } else if (event.requestType === ProxyFetchRequestType.STOP) {
                        callback && callback(new DataStopAcknowledge());

                        const serverLineFound = serverLogLines.find((l: string) =>
                            findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                                return (
                                    activityLogLine.eventType === ActivityLogEventType.DATA_BATCH_DOWNLOAD_STOPPED &&
                                    (activityLogLine.username === "testA-registry-data" ||
                                        activityLogLine.username == null) &&
                                    activityLogLine.targetPackageIdentifier === "testA-registry-data/simple"
                                );
                            })
                        );

                        if (!serverLineFound) {
                            reject(new Error("Server log line not found"));
                        } else {
                            resolve(records);
                        }
                    } else {
                        callback && callback(new ErrorResponse("Unknown message type", SocketError.NOT_VALID));
                        throw new Error("Unknown message type:" + JSON.stringify(event));
                    }
                }
            );

            socket.emit(
                openChannelResponse.channelName,
                new StartProxyFetchRequest(0),
                (response: StartFetchRequest | ErrorResponse) => {
                    if ((response as ErrorResponse).responseType === SocketResponseType.ERROR) {
                        reject(new Error((response as ErrorResponse).message));
                    }

                    const serverLineFound = serverLogLines.find((l: string) =>
                        findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                            return (
                                activityLogLine.eventType === ActivityLogEventType.DATA_BATCH_DOWNLOAD_STARTED &&
                                (activityLogLine.username === "testA-registry-data" ||
                                    activityLogLine.username == null) &&
                                activityLogLine.targetPackageIdentifier === "testA-registry-data/simple"
                            );
                        })
                    );

                    if (!serverLineFound) {
                        reject(new Error("No server log line found for data batch download started"));
                    }
                }
            );
        });

        expect(records.length).equal(2);

        expect(records[0].offset).equal(0);
        expect(records[0].record.string).equal("Test string");
        expect(records[0].record.number).equal(3.1465);
        expect(records[0].record.boolean).equal(true);
        expect((records[0].record.date as Date).getTime()).equal(recordZeroDate.getTime());
        expect((records[0].record.dateTime as Date).getTime()).equal(recordZeroDateTime.getTime());
        expect(records[0].record.stringNulls).equal(null);

        expect(records[1].offset).equal(1);
        expect(records[1].record.string).equal("Another string");
        expect(records[1].record.number).equal(42);
        expect(records[1].record.boolean).equal(true);
        expect((records[1].record.date as Date).getTime()).equal(recordOneDate.getTime());
        expect((records[1].record.dateTime as Date).getTime()).equal(recordOneDate.getTime());
        expect(records[1].record.stringNulls).equal("not a null");
    };

    it("User A can download data", async function () {
        await downloadAndValidateData(userAStreamingClient, "testA-registry-data");
    });

    it("Anonymous user can not download data", async function () {
        const response = await new Promise<PackageStreamsResponse | ErrorResponse>((resolve, reject) => {
            anonymousStreamingClient.emit(
                SocketEvent.SCHEMA_INFO_REQUEST,
                new PackageStreamsRequest({
                    catalogSlug: "testA-registry-data",
                    packageSlug: "simple",
                    majorVersion: 1,
                    registryUrl: "http://localhost:4000"
                }),
                (response: PackageStreamsResponse | ErrorResponse) => {
                    resolve(response);
                }
            );
        });

        expect(response.responseType).equal(SocketResponseType.ERROR);

        expect((response as ErrorResponse).errorType).equal(SocketError.NOT_AUTHORIZED);
    });

    it("User A set catalog public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,

            variables: {
                identifier: {
                    catalogSlug: "testA-registry-data"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("User A can set package public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-registry-data",
                    packageSlug: "simple"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.updatePackage.catalog?.displayName).to.equal("testA-registry-data");
        expect(response.data?.updatePackage.latestVersion).to.not.equal(null);

        const identifier = response.data?.updatePackage.latestVersion?.identifier;

        expect(identifier?.versionMajor).to.equal(1);
        expect(identifier?.versionMinor).to.equal(0);
        expect(identifier?.versionPatch).to.equal(0);
    });

    it("Anonymous user can access package", async function () {
        const response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-registry-data",
                    packageSlug: "simple"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const responsePackageFileContents = response.data?.package.latestVersion?.packageFile;

        const responsePackageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(responsePackageFile.sources.length).to.equal(1);
        expect(responsePackageFile.sources[0].type).equal("datapm");
        expect(responsePackageFile.sources[0].configuration?.catalogSlug).equal("testA-registry-data");
        expect(responsePackageFile.sources[0].configuration?.packageSlug).equal("simple");
        expect(responsePackageFile.sources[0].configuration?.version).equal(1);
        expect(responsePackageFile.sources[0].streamSets[0].slug).equal("simple");
    });

    it("User still without any permission can not upload data", async function () {
        const response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userBStreamingClient.emit(
                SocketEvent.START_DATA_UPLOAD,
                new StartUploadRequest(
                    {
                        catalogSlug: "testA-registry-data",
                        packageSlug: "simple",
                        majorVersion: 1,
                        registryUrl: "http://localhost:4000",
                        sourceType: "test",
                        sourceSlug: "test",
                        streamSetSlug: "simple",
                        streamSlug: "simple",
                        schemaTitle: "simple"
                    },
                    true,
                    UpdateMethod.BATCH_FULL_SET
                ),
                (response: StartUploadResponse) => {
                    resolve(response);
                }
            );
        });

        expect(response.responseType).equal(SocketResponseType.ERROR);

        const errorResponse: ErrorResponse = response as ErrorResponse;
        expect(errorResponse.errorType).equal(SocketError.NOT_AUTHORIZED);
        expect(errorResponse.message).include("NOT_AUTHORIZED");
    });

    it("Anonymous user can download data", async function () {
        await downloadAndValidateData(anonymousStreamingClient, "testA-registry-data");
    });

    it("Move the package", async function () {
        const createCatalogresponse = await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    displayName: "testA-registry-data-2",
                    slug: "testA-registry-data-2",
                    isPublic: false
                }
            }
        });

        expect(createCatalogresponse.errors == null, "no errors").equal(true);

        const movePackageResponse = await userAClient.mutate({
            mutation: MovePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-registry-data",
                    packageSlug: "simple"
                },
                catalogIdentifier: {
                    catalogSlug: "testA-registry-data-2"
                }
            }
        });

        expect(movePackageResponse.errors == null, "no errors").equal(true);
    });

    it("User A can download data after it has been moved", async function () {
        await downloadAndValidateData(userAStreamingClient, "testA-registry-data-2");
    });

    it("More data can be uploaded", async function () {
        const response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                SocketEvent.START_DATA_UPLOAD,
                new StartUploadRequest(
                    {
                        catalogSlug: "testA-registry-data-2",
                        packageSlug: "simple",
                        majorVersion: 1,
                        registryUrl: "http://localhost:4000",
                        sourceType: "test",
                        sourceSlug: "test",
                        streamSetSlug: "simple",
                        streamSlug: "simple",
                        schemaTitle: "simple"
                    },
                    false,
                    UpdateMethod.APPEND_ONLY_LOG
                ),
                (response: StartUploadResponse) => {
                    resolve(response);
                }
            );
        });

        expect(response.responseType).equal(SocketResponseType.START_DATA_UPLOAD_RESPONSE);

        const startResponse: StartUploadResponse = response as StartUploadResponse;

        const records: DataRecordContext[] = [
            {
                offset: 2,
                record: {
                    string: "Third record",
                    number: -1,
                    boolean: false,
                    date: recordZeroDate,
                    dateTime: recordZeroDateTime,
                    stringNulls: "still not null"
                }
            }
        ];

        const uploadDataResponse = await new Promise<UploadDataResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                startResponse.channelName,
                new UploadDataRequest(records),
                (response: UploadDataResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        reject(new Error((response as ErrorResponse).message));
                    }

                    resolve(response as UploadDataResponse);
                }
            );
        });

        expect(uploadDataResponse.responseType).equal(UploadResponseType.UPLOAD_RESPONSE);

        const stopUploadResponse = await new Promise<UploadStopResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                startResponse.channelName,
                new UploadStopRequest(),
                (response: UploadStopResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        reject(new Error((response as ErrorResponse).message));
                    }

                    resolve(response as UploadStopResponse);
                }
            );
        });

        expect(stopUploadResponse.responseType).equal(UploadResponseType.UPLOAD_STOP_RESPONSE);
    });

    it("Expect to be able to read new records only", async function () {
        const streamInfoResponse = await new Promise<PackageStreamsResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                SocketEvent.SCHEMA_INFO_REQUEST,
                new PackageStreamsRequest({
                    catalogSlug: "testA-registry-data-2",
                    packageSlug: "simple",
                    majorVersion: 1,
                    registryUrl: "http://localhost:4000"
                }),
                (response: PackageStreamsResponse | ErrorResponse) => {
                    resolve(response);
                }
            );
        });

        if (streamInfoResponse.responseType === SocketResponseType.ERROR) {
            console.log(JSON.stringify(streamInfoResponse));
        }

        expect(streamInfoResponse.responseType).equal(SocketResponseType.SCHEMA_INFO_RESPONSE);

        const packageStreamsResponse: PackageStreamsResponse = streamInfoResponse as PackageStreamsResponse;
        expect(packageStreamsResponse.batchesBySchema.simple[0].highestOffset).equal(2);
        expect(packageStreamsResponse.batchesBySchema.simple[0].updateMethod).equal(UpdateMethod.APPEND_ONLY_LOG);

        const response = await new Promise<OpenFetchProxyChannelResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                SocketEvent.OPEN_FETCH_CHANNEL,
                new OpenFetchProxyChannelRequest(packageStreamsResponse.batchesBySchema.simple[0].batchIdentifier),
                (response: OpenFetchProxyChannelResponse) => {
                    resolve(response);
                }
            );
        });

        expect(response.responseType).equal(SocketResponseType.OPEN_FETCH_CHANNEL_RESPONSE);

        const openChannelResponse: OpenFetchProxyChannelResponse = response as OpenFetchProxyChannelResponse;

        expect(openChannelResponse.channelName).not.equal(undefined);

        const records: DataRecordContext[] = await new Promise<DataRecordContext[]>((resolve, reject) => {
            let records: DataRecordContext[] = [];

            userAStreamingClient.on(
                openChannelResponse.channelName,
                (event: DataSend | DataStop, callback?: (response: ProxyFetchResponse | ErrorResponse) => void) => {
                    if (event.requestType === ProxyFetchRequestType.DATA) {
                        records = records.concat((event as DataSend).records);
                        callback && callback(new DataAcknowledge());
                    } else if (event.requestType === ProxyFetchRequestType.STOP) {
                        callback && callback(new DataStopAcknowledge());
                        resolve(records);
                    } else {
                        callback && callback(new ErrorResponse("Unknown message type", SocketError.NOT_VALID));
                        throw new Error("Unknown message type:" + JSON.stringify(event));
                    }
                }
            );

            userAStreamingClient.emit(
                openChannelResponse.channelName,
                new StartProxyFetchRequest(2),
                (response: StartProxyFetchRequest | ErrorResponse) => {
                    if ((response as ErrorResponse).responseType === SocketResponseType.ERROR) {
                        reject(new Error((response as ErrorResponse).message));
                    }
                }
            );
        });

        expect(records.length).equal(1);

        expect(records[0].record.string).equal("Third record");
    });

    it("Read version data state", async function () {
        const response = await new Promise<PackageSinkStateResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                SocketEvent.PACKAGE_VERSION_SINK_STATE_REQUEST,
                new PackageSinkStateRequest({
                    catalogSlug: "testA-registry-data-2",
                    packageSlug: "simple",
                    majorVersion: 1,
                    registryUrl: "http://localhost:4000"
                }),
                (response: PackageSinkStateResponse | ErrorResponse) => {
                    resolve(response);
                }
            );
        });

        if (response.responseType === SocketResponseType.ERROR) {
            console.log(JSON.stringify(response));
        }

        expect(response.responseType).equal(SocketResponseType.PACKAGE_VERSION_SINK_STATE_RESPONSE);

        const pacakgeDataInfoResponse = response as PackageSinkStateResponse;

        expect(pacakgeDataInfoResponse.identifier.catalogSlug).equal("testA-registry-data-2");
        expect(pacakgeDataInfoResponse.identifier.packageSlug).equal("simple");
        expect(pacakgeDataInfoResponse.identifier.majorVersion).equal(1);
        expect(pacakgeDataInfoResponse.identifier.registryUrl).equal("http://localhost:4000");

        expect(pacakgeDataInfoResponse.state.packageVersion).equal("1.0.0");
        expect(
            pacakgeDataInfoResponse.state.streamSets.simple.streamStates.simple.schemaStates.simple.lastOffset
        ).equal(2);
    });
});
