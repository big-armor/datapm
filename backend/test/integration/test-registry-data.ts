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
    CreateCatalogDocument
} from "./registry-client";
import { createAnonymousClient, createAnonymousStreamingClient, createAuthenicatedStreamingClient, createUser } from "./test-utils";
import { parsePackageFileJSON, loadPackageFileFromDisk, PublishMethod, SocketEvent, StartFetchRequest, ErrorResponse, StartFetchResponse, SocketResponseType, SocketError, StartUploadRequest, UploadDataRequest, UploadDataResponse, RecordContext, StartUploadResponse, UploadResponseType, UploadStopRequest, UploadStopResponse, SchemaInfoRequest, SchemaInfoResponse, OpenFetchChannelResponse, OpenFetchChannelRequest, DataSend, DataStop, FetchRequestType, SetStreamActiveBatchesResponse, SetStreamActiveBatchesRequest, FetchResponse, DataAcknowledge, DataStopAcknowledge, DPMRecord, DataRecordContext } from "datapm-lib";
import { describe, it } from "mocha";
import request = require("superagent");
import { Socket } from "socket.io-client";


/** Tests when the registry is used as a repository for the data of a package */
describe("Data Store on Registry", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    let userAToken: string = "Bearer ";
    let userBToken: string = "Bearer ";

    let anonymousStreamingClient:Socket;
    let userAStreamingClient:Socket;
    let userBStreamingClient:Socket;

    before(async () => {});

    after(async () => {

        if(anonymousStreamingClient) {
            anonymousStreamingClient.disconnect();
        }

        if(userAStreamingClient) {
            userAStreamingClient.disconnect();
        }

        if(userBStreamingClient) {
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
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;


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
        let response = await userAClient.mutate({
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
        expect(response.data!.createPackage.catalog?.displayName).to.equal("testA-registry-data");
        expect(response.data!.createPackage.description).to.equal("Test of simple values");
        expect(response.data!.createPackage.displayName).to.equal("Simple");
        expect(response.data!.createPackage.identifier.catalogSlug).to.equal("testA-registry-data");
        expect(response.data!.createPackage.identifier.packageSlug).to.equal("simple");
        expect(response.data!.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish first version", async function () {
        let packageFileContents = loadPackageFileFromDisk("test/data-files/simple/simple.datapm.json");

        packageFileContents.registries = [{
            catalogSlug: "testA-registry-data",
            publishMethod: PublishMethod.SCHEMA_AND_DATA,
            url: "http://localhost:4200"
        }];

        const packageFileString = JSON.stringify(packageFileContents);

        let response = await userAClient.mutate({
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


        expect(response.errors == null, "no errors").true;
        expect(response.data!.createVersion.author?.username).equal("testA-registry-data");

        const responsePackageFileContents = response.data!.createVersion.packageFile;

        const responsePackageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(responsePackageFile.readmeMarkdown).includes("Simple");
        expect(responsePackageFile.licenseMarkdown).includes("License not defined");

        expect(responsePackageFile.registries![0].publishMethod).equal(PublishMethod.SCHEMA_AND_DATA);
        expect(responsePackageFile.sources![0].type).equal("datapmRegistry");
        expect(responsePackageFile.sources![0].streamSets[0].slug).equal("simple");
        
        
    });

    it("Connect to websocket for data uploads", async function(){

        anonymousStreamingClient = await createAnonymousStreamingClient();

        userAStreamingClient = await createAuthenicatedStreamingClient(
                "testA-registry-data@test.datapm.io",
                "passwordA!");

        userBStreamingClient = await createAuthenicatedStreamingClient(
            "testB-registry-data@test.datapm.io",
            "passwordB!");

    });

    it("Anonymous catalog not found", async function () {

        let notFoundErrorRecieved = false;

        await new Promise<void>((resolve, reject) => {
            anonymousStreamingClient.emit(SocketEvent.OPEN_FETCH_CHANNEL, new OpenFetchChannelRequest({
                catalogSlug: "not-found",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple",
                streamSlug: "simple",
                batch: 1
            }),(response: StartFetchResponse | ErrorResponse) => {
                if(response.responseType === SocketResponseType.ERROR) {

                    const error = response as ErrorResponse;
                    if(error.errorType === SocketError.NOT_FOUND) {
                        notFoundErrorRecieved = true;
                    }
                    resolve();
                } else {
                    reject(new Error("Expected error"));
                }
            });
        });

        expect(notFoundErrorRecieved).to.equal(true);
        

    });


    it("Package not found", async function () {

        let notFoundErrorRecieved = false;

        await new Promise<void>((resolve, reject) => {
            anonymousStreamingClient.emit(SocketEvent.OPEN_FETCH_CHANNEL, new OpenFetchChannelRequest({
                catalogSlug: "testA-registry-data",
                packageSlug: "not-correct",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple",
                streamSlug: "simple",
                batch: 1
            }),(response: StartFetchResponse | ErrorResponse) => {
                if(response.responseType === SocketResponseType.ERROR) {

                    const error = response as ErrorResponse;
                    if(error.errorType === SocketError.NOT_FOUND) {
                        notFoundErrorRecieved = true;
                    }
                    resolve();
                } else {
                    reject(new Error("Expected error"));
                }
            });
        });

        expect(notFoundErrorRecieved).to.equal(true);

    });
    
    it("Anonymous not authorized to access", async function () {

        let notAuthorizedErrorRecieved = false;

        await new Promise<void>((resolve, reject) => {
            anonymousStreamingClient.emit(SocketEvent.OPEN_FETCH_CHANNEL, new OpenFetchChannelRequest({
                catalogSlug: "testA-registry-data",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple",
                streamSlug: "simple",
                batch: 1
            }),(response: StartFetchResponse | ErrorResponse) => {
                if(response.responseType === SocketResponseType.ERROR) {

                    const error = response as ErrorResponse;
                    if(error.errorType === SocketError.NOT_AUTHORIZED) {
                        notAuthorizedErrorRecieved = true;
                    }
                    resolve();
                } else {
                    reject(new Error("Expected not authorized error"));
                }
            });
        });

        expect(notAuthorizedErrorRecieved).to.equal(true);
      
    });


    it("User A can not upload data to a non-specified schema", async function () {


        let response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(SocketEvent.START_DATA_UPLOAD, new StartUploadRequest({
                catalogSlug: "testA-registry-data",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "wrong-schema",
                streamSlug: "simple"
            },true),(response: StartUploadResponse) => {
                resolve(response);
            });
        });

        expect(response.responseType).equal(SocketResponseType.ERROR);

        const uploadResponse:ErrorResponse = response as ErrorResponse;

        expect(uploadResponse.errorType).equal(SocketError.NOT_VALID);
        expect(uploadResponse.message).include("SCHEMA_NOT_VALID");


    });

    const recordZeroDate: Date = new Date();
    const recordZeroDateTime = new Date();
    const recordOneDate: Date = new Date();
    const recordOneDateTime = new Date();

    it("User A can upload data", async function () {

        let response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(SocketEvent.START_DATA_UPLOAD, new StartUploadRequest({
                catalogSlug: "testA-registry-data",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple",
                streamSlug: "simple"
            },true),(response: StartUploadResponse) => {
                resolve(response);
            });
        });

        expect(response.responseType).equal(SocketResponseType.START_DATA_UPLOAD_RESPONSE);

        const startResponse:StartUploadResponse = response as StartUploadResponse;

        expect(startResponse.batchIdentifier.registryUrl).equal("http://localhost:4000");
        expect(startResponse.batchIdentifier.catalogSlug).equal("testA-registry-data");
        expect(startResponse.batchIdentifier.majorVersion).equal(1);
        expect(startResponse.batchIdentifier.packageSlug).equal("simple");
        expect(startResponse.batchIdentifier.schemaTitle).equal("simple");
        expect(startResponse.batchIdentifier.streamSlug).equal("simple");
        expect(startResponse.batchIdentifier.batch).equal(1);

        const records:DataRecordContext[] = [

            {
                offset:0,
                record:{
                    string: "Test string",
                    number: 3.1465,
                    boolean: true,
                    date: recordZeroDate,
                    dateTime: recordZeroDateTime,
                    stringNulls: null
                }
            },
            {
                offset:1,
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

        let uploadDataResponse = await new Promise<UploadDataResponse>((resolve,reject) => {
            userAStreamingClient.emit(startResponse.channelName, new UploadDataRequest(records),(response: UploadDataResponse | ErrorResponse) => {

                if(response.responseType === SocketResponseType.ERROR) {
                    reject(response as ErrorResponse);
                }

                resolve(response as UploadDataResponse);
            });
    
        });


        expect(uploadDataResponse.responseType).equal(UploadResponseType.UPLOAD_RESPONSE);



        let stopUploadResponse = await new Promise<UploadStopResponse>((resolve,reject) => {
            userAStreamingClient.emit(startResponse.channelName, new UploadStopRequest(),(response: UploadStopResponse | ErrorResponse) => {

                if(response.responseType === SocketResponseType.ERROR) {
                    reject(response as ErrorResponse);
                }

                resolve(response as UploadStopResponse);
            });
    
        });


        expect(stopUploadResponse.responseType).equal(UploadResponseType.UPLOAD_STOP_RESPONSE);

        let updateDefaultResponse = await new Promise<SetStreamActiveBatchesResponse>((resolve,reject) => {
            userAStreamingClient.emit(SocketEvent.SET_STREAM_ACTIVE_BATCHES, new SetStreamActiveBatchesRequest([{
                catalogSlug: "testA-registry-data",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple",
                streamSlug: "simple",
                batch: 1
            }]),(response: SetStreamActiveBatchesResponse | ErrorResponse) => {

                if(response.responseType === SocketResponseType.ERROR) {
                    reject(response as ErrorResponse);
                }

                resolve(response as SetStreamActiveBatchesResponse);
            });
    
        });

        expect(updateDefaultResponse.responseType).equal(SocketResponseType.SET_STREAM_ACTIVE_BATCHES);

        expect(updateDefaultResponse.batchIdentifiers[0].registryUrl).equal("http://localhost:4000");
        expect(updateDefaultResponse.batchIdentifiers[0].catalogSlug).equal("testA-registry-data");
        expect(updateDefaultResponse.batchIdentifiers[0].majorVersion).equal(1);
        expect(updateDefaultResponse.batchIdentifiers[0].packageSlug).equal("simple");
        expect(updateDefaultResponse.batchIdentifiers[0].schemaTitle).equal("simple");
        expect(updateDefaultResponse.batchIdentifiers[0].streamSlug).equal("simple");
        expect(updateDefaultResponse.batchIdentifiers[0].batch).equal(1);

    });

    /** Future strict mode 
     * 
     * it("User cannot upload data that doesn't match the sheet", async function () {


    });
    */

    it("User without any permission can not upload data", async function () {

        let response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userBStreamingClient.emit(SocketEvent.START_DATA_UPLOAD, new StartUploadRequest({
                catalogSlug: "testA-registry-data",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple",
                streamSlug: "simple"
            },true),(response: StartUploadResponse) => {
                resolve(response);
            });
        });

        expect(response.responseType).equal(SocketResponseType.ERROR);

        const errorResponse:ErrorResponse = response as ErrorResponse;
        expect(errorResponse.errorType).equal(SocketError.NOT_AUTHORIZED);
        expect(errorResponse.message).include("NOT_AUTHORIZED");


    });

    const downloadAndValidateData = async (socket:Socket, catalogSlug:string) => {
        let streamInfoResponse = await new Promise<SchemaInfoResponse | ErrorResponse>((resolve, reject) => {
        
            socket.emit(SocketEvent.SCHEMA_INFO_REQUEST, new SchemaInfoRequest({
                catalogSlug,
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple"
            }),(response: SchemaInfoResponse | ErrorResponse) => {
                resolve(response);
            });
            
        });

        if(streamInfoResponse.responseType === SocketResponseType.ERROR) {
            console.log(JSON.stringify(streamInfoResponse));
        }

        expect(streamInfoResponse.responseType).equal(SocketResponseType.SCHEMA_INFO_RESPONSE);

        const schemaInfoResponse:SchemaInfoResponse = streamInfoResponse as SchemaInfoResponse;
        expect(schemaInfoResponse.identifier.registryUrl).equal("http://localhost:4000");
        expect(schemaInfoResponse.identifier.catalogSlug).equal(catalogSlug);
        expect(schemaInfoResponse.identifier.packageSlug).equal("simple");
        expect(schemaInfoResponse.identifier.majorVersion).equal(1);
        expect(schemaInfoResponse.identifier.schemaTitle).equal("simple");

        expect(schemaInfoResponse.batches.length).equal(1);

        expect(schemaInfoResponse.batches[0].batchIdentifier.batch).equal(1);
        expect(schemaInfoResponse.batches[0].batchIdentifier.streamSlug).equal("simple");
        expect(schemaInfoResponse.batches[0].highestOffset).equal(1);

        let response = await new Promise<OpenFetchChannelResponse | ErrorResponse>((resolve, reject) => {
            socket.emit(SocketEvent.OPEN_FETCH_CHANNEL , new OpenFetchChannelRequest(schemaInfoResponse.batches[0].batchIdentifier),(response: OpenFetchChannelResponse) => {
                resolve(response);
            });
        });

        expect(response.responseType).equal(SocketResponseType.OPEN_FETCH_CHANNEL_RESPONSE);

        const openChannelResponse:OpenFetchChannelResponse = response as OpenFetchChannelResponse;

        expect(openChannelResponse.channelName).not.equal(undefined);

        const records:DataRecordContext[] = await new Promise<DataRecordContext[]>((resolve,reject) => {

            let records:DataRecordContext[] = [];

            socket.on(openChannelResponse.channelName,(event:DataSend | DataStop, callback:(response:FetchResponse | ErrorResponse) => void) => {
        
                if(event.requestType === FetchRequestType.DATA) {
                    records = records.concat((event as DataSend).records);
                    callback(new DataAcknowledge());
                }
                else if(event.requestType === FetchRequestType.STOP) {
                    callback(new DataStopAcknowledge());
                    resolve(records);

                } else {
                    callback(new ErrorResponse("Unknown message type",SocketError.NOT_VALID));
                    throw new Error("Unknown message type:" + JSON.stringify(event));
                }


            });
    
            socket.emit(openChannelResponse.channelName, new StartFetchRequest(0),(response: StartFetchRequest | ErrorResponse) => {
                if((response as ErrorResponse).responseType === SocketResponseType.ERROR) {
                    reject(response as ErrorResponse);
                }
            });
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
    }

    it("User A can download data", async function () {
        
        await downloadAndValidateData(userAStreamingClient, "testA-registry-data");
    
    });

    it("Anonymous user can not download data", async function() {

        let response = await new Promise<SchemaInfoResponse | ErrorResponse>((resolve, reject) => {
        
            anonymousStreamingClient.emit(SocketEvent.SCHEMA_INFO_REQUEST, new SchemaInfoRequest({
                catalogSlug: "testA-registry-data",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple"
            }),(response: SchemaInfoResponse | ErrorResponse) => {
                resolve(response);
            });
            
        });


        expect(response.responseType).equal(SocketResponseType.ERROR);

        expect((response as ErrorResponse).errorType).equal(SocketError.NOT_AUTHORIZED);



    });

    it("User A set catalog public", async function(){
    
        let response = await userAClient.mutate({
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

        expect(response.errors == null, "no errors").true;
    });





    it("User A can set package public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-registry-data",
                    packageSlug: "simple"
                },
                value: {
                    isPublic: true,
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data!.updatePackage.catalog?.displayName).to.equal("testA-registry-data");
        expect(response.data!.updatePackage.latestVersion).to.not.equal(null);

        const identifier = response.data!.updatePackage.latestVersion!.identifier;

        expect(identifier.versionMajor).to.equal(1);
        expect(identifier.versionMinor).to.equal(0);
        expect(identifier.versionPatch).to.equal(0);
    });

    it("Anonymous user can access package", async function () {
        let response = await anonymousClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-registry-data",
                    packageSlug: "simple"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const responsePackageFileContents = response.data!.package.latestVersion!.packageFile;

        const responsePackageFile = parsePackageFileJSON(responsePackageFileContents);


        expect(responsePackageFile.sources.length).to.equal(1);
        expect(responsePackageFile.sources[0].type).equal("datapmRegistry");
        expect(responsePackageFile.sources[0].configuration!.catalogSlug).equal("testA-registry-data");
        expect(responsePackageFile.sources[0].configuration!.packageSlug).equal("simple");
        expect(responsePackageFile.sources[0].configuration!.version).equal(1);
        expect(responsePackageFile.sources[0].streamSets[0].slug).equal("simple");
        expect(responsePackageFile.sources[0].streamSets[0].configuration.schemaSlug).equal("simple");
        
    });

    it("User still without any permission can not upload data", async function () {

        let response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userBStreamingClient.emit(SocketEvent.START_DATA_UPLOAD, new StartUploadRequest({
                catalogSlug: "testA-registry-data",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple",
                streamSlug: "simple"
            },true),(response: StartUploadResponse) => {
                resolve(response);
            });
        });

        expect(response.responseType).equal(SocketResponseType.ERROR);

        const errorResponse:ErrorResponse = response as ErrorResponse;
        expect(errorResponse.errorType).equal(SocketError.NOT_AUTHORIZED);
        expect(errorResponse.message).include("NOT_AUTHORIZED");

    });

    it("Anonymous user can download data", async function() {

        await downloadAndValidateData(anonymousStreamingClient, "testA-registry-data");

    });

    it("Move the package", async function(){

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

    it("User A can download data after it has been moved", async function() {

        await downloadAndValidateData(userAStreamingClient, "testA-registry-data-2");

    });


    it("More data can be uploaded", async function(){
        let response = await new Promise<StartUploadResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(SocketEvent.START_DATA_UPLOAD, new StartUploadRequest({
                catalogSlug: "testA-registry-data-2",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple",
                streamSlug: "simple"
            },false),(response: StartUploadResponse) => {
                resolve(response);
            });
        });

        expect(response.responseType).equal(SocketResponseType.START_DATA_UPLOAD_RESPONSE);

        const startResponse:StartUploadResponse = response as StartUploadResponse;

        const records:DataRecordContext[] = [
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

        let uploadDataResponse = await new Promise<UploadDataResponse>((resolve,reject) => {
            userAStreamingClient.emit(startResponse.channelName, new UploadDataRequest(records),(response: UploadDataResponse | ErrorResponse) => {

                if(response.responseType === SocketResponseType.ERROR) {
                    reject(response as ErrorResponse);
                }

                resolve(response as UploadDataResponse);
            });
    
        });


        expect(uploadDataResponse.responseType).equal(UploadResponseType.UPLOAD_RESPONSE);

        let stopUploadResponse = await new Promise<UploadStopResponse>((resolve,reject) => {
            userAStreamingClient.emit(startResponse.channelName, new UploadStopRequest(),(response: UploadStopResponse | ErrorResponse) => {

                if(response.responseType === SocketResponseType.ERROR) {
                    reject(response as ErrorResponse);
                }

                resolve(response as UploadStopResponse);
            });
    
        });


        expect(stopUploadResponse.responseType).equal(UploadResponseType.UPLOAD_STOP_RESPONSE);


    });


    it("Expect to be able to read new records only", async function() {
        let streamInfoResponse = await new Promise<SchemaInfoResponse | ErrorResponse>((resolve, reject) => {
        
            userAStreamingClient.emit(SocketEvent.SCHEMA_INFO_REQUEST, new SchemaInfoRequest({
                catalogSlug: "testA-registry-data-2",
                packageSlug: "simple",
                majorVersion: 1,
                registryUrl: "http://localhost:4000",
                schemaTitle: "simple"
            }),(response: SchemaInfoResponse | ErrorResponse) => {
                resolve(response);
            });
            
        });

        if(streamInfoResponse.responseType === SocketResponseType.ERROR) {
            console.log(JSON.stringify(streamInfoResponse));
        }

        expect(streamInfoResponse.responseType).equal(SocketResponseType.SCHEMA_INFO_RESPONSE);

        const schemaInfoResponse:SchemaInfoResponse = streamInfoResponse as SchemaInfoResponse;
        expect(schemaInfoResponse.batches[0].highestOffset).equal(2);

        let response = await new Promise<OpenFetchChannelResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(SocketEvent.OPEN_FETCH_CHANNEL , new OpenFetchChannelRequest(schemaInfoResponse.batches[0].batchIdentifier),(response: OpenFetchChannelResponse) => {
                resolve(response);
            });
        });

        expect(response.responseType).equal(SocketResponseType.OPEN_FETCH_CHANNEL_RESPONSE);

        const openChannelResponse:OpenFetchChannelResponse = response as OpenFetchChannelResponse;

        expect(openChannelResponse.channelName).not.equal(undefined);

        const records:DataRecordContext[] = await new Promise<DataRecordContext[]>((resolve,reject) => {

            let records:DataRecordContext[] = [];

            userAStreamingClient.on(openChannelResponse.channelName,(event:DataSend | DataStop, callback:(response:FetchResponse | ErrorResponse) => void) => {
        
                if(event.requestType === FetchRequestType.DATA) {
                    records = records.concat((event as DataSend).records);
                    callback(new DataAcknowledge());
                }
                else if(event.requestType === FetchRequestType.STOP) {
                    callback(new DataStopAcknowledge());
                    resolve(records);

                } else {
                    callback(new ErrorResponse("Unknown message type",SocketError.NOT_VALID));
                    throw new Error("Unknown message type:" + JSON.stringify(event));
                }


            });
    
            userAStreamingClient.emit(openChannelResponse.channelName, new StartFetchRequest(2),(response: StartFetchRequest | ErrorResponse) => {
                if((response as ErrorResponse).responseType === SocketResponseType.ERROR) {
                    reject(response as ErrorResponse);
                }
            });
        });

        expect(records.length).equal(1);

        expect(records[0].record.string).equal("Third record");
    });
    
})
