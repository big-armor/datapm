/** Test's the ability for a client to run the Update Job */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    LoginDocument,
    ActivityLogEventType,
    PackageDocument
} from "./registry-client";
import { createAnonymousClient, createAnonymousStreamingClient, createAuthenicatedStreamingClient, createUser } from "./test-utils";
import { StartPackageUpdateResponse, ErrorResponse, StartPackageUpdateRequest, SocketResponseType, SocketEvent, JobMessageResponse, JobMessageRequest, JobRequestType, StartPackageResponse, StartPackageRequest, ParameterAnswer } from "datapm-lib";
import { describe, it } from "mocha";
import { Socket } from "socket.io-client";
import { ActivityLogLine, findActivityLogLine, serverLogLines } from "./setup";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { LogWaitStrategy } from "testcontainers/dist/wait-strategy";
import { Client } from "pg";
import fs from "fs";
import path from "path";


/** Tests when the registry is used as a proxy for a published data package */
describe("Package Job With Authentication Tests", async () => {
   let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    let postgresContainer: StartedTestContainer;
    let postgresHost: string;
    let postgresPort: number;

    let userAToken: string = "Bearer ";
    let userBToken: string = "Bearer ";

    let anonymousStreamingClient:Socket;
    let userAStreamingClient:Socket;
    let userBStreamingClient:Socket;

    let postgresClient:Client;

    before(async function() {

        this.timeout(200000);

        console.log("Starting postgres source container");
        postgresContainer = await new GenericContainer("postgres")
            .withEnv("POSTGRES_PASSWORD", "postgres")
            .withEnv("POSTGRES_DB", "datapm")
            .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
            .withExposedPorts(5432)
            .withWaitStrategy(new LogWaitStrategy("database system is ready to accept connections"))
            .start();

        postgresHost = postgresContainer.getContainerIpAddress();
        postgresPort = postgresContainer.getMappedPort(5432);

        console.log("test postgress server port  " + postgresPort);


        postgresClient = new Client({
            host: postgresHost,
            port: postgresPort,
            user: "postgres",
            password: "postgres",
            database: "datapm"
        });
        
        // TODO This wait seems necessary, even though the database reports the system is ready.
        await new Promise((resolve, reject) => {
            setTimeout(resolve, 1000);
        });

        await postgresClient.connect();

        const testData = fs.readFileSync(path.join("test","data-files","postgres-test-data.sql"));
        await postgresClient.query(testData.toString())

    });

    after(async () => {

        if(postgresClient)
            await postgresClient.end();

        if(userAStreamingClient
            && userAStreamingClient.connected) {
            userAStreamingClient.close();
        }

        if(userBStreamingClient
            && userBStreamingClient.connected) {
            userBStreamingClient.close();
        }

        if(anonymousStreamingClient
            && anonymousStreamingClient.connected) {
            anonymousStreamingClient.close();
        }

        if(postgresContainer) {
            await postgresContainer.stop();
        }
    });

    it("Create users A", async function () {
        this.timeout(10000);
        
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-ws-update-postgres",
            "testA-ws-update-postgres@test.datapm.io",
            "passwordA!"
        );
        expect(userAClient).to.exist;

    });


    it("Create users B", async function () {
        this.timeout(10000);
        
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-ws-update-postgres",
            "testB-ws-update-postgres@test.datapm.io",
            "passwordB!"
        );

        expect(userBClient).to.exist;

    });

    it("User A login", async function () {
        this.timeout(10000);

         const userALogin = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testA-ws-update-postgres",
                password: "passwordA!"
            }
        });

        if (!userALogin.data?.login) {
            throw new Error("Authentication didn't work for user A");
        }

        userAToken += userALogin.data.login;
    });

    it("User B login", async function () {
        this.timeout(10000);
        
        const userBLogin = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testB-ws-update-postgres",
                password: "passwordB!"
            }
        });

        if (!userBLogin.data?.login) {
            throw new Error("Authentication didn't work for user B");
        }

        userBToken += userBLogin.data.login;
    });

    it("Connect to websocket", async function(){

        anonymousStreamingClient = await createAnonymousStreamingClient();

        userAStreamingClient = await createAuthenicatedStreamingClient(
                "testA-ws-update-postgres@test.datapm.io",
                "passwordA!");

        userBStreamingClient = await createAuthenicatedStreamingClient(
            "testB-ws-update-postgres@test.datapm.io",
            "passwordB!");

    });

    it("Should run package job", async () => {
        
        let response = await new Promise<StartPackageResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(SocketEvent.START_PACKAGE, new StartPackageRequest("testA-ws-update-postgres", "test-postgres", "Test package for updates", "Test package description"),(response: StartPackageResponse) => {
                resolve(response);
            });
        });

        expect(response.responseType).equal(SocketResponseType.START_PACKAGE_RESPONSE);

        expect(
            serverLogLines.find((l: any) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType == ActivityLogEventType.PACKAGE_JOB_STARTED &&
                        activityLogLine.username == "testA-ws-update-postgres" &&
                        activityLogLine.targetCatalogSlug == "testA-ws-update-postgres" 
                    );
                })
            )
        ).to.be.not.undefined;
        
        const successResponse = response as StartPackageResponse;

        const promptResponses: {
            name: string,
            response: string | string[] | boolean
        }[] = [
            {
                name: "source",
                response: "postgres"
            },
            {
                name: "host",
                response: postgresHost
            },
            {
                name: "port",
                response: postgresPort.toString()
            },
            {
                name: "username",
                response: "postgres"
            },
            {
                name: "password",
                response: "postgres"
            },
            {
                name: "database",
                response: "datapm"
            },
            {
                name: "schema",
                response: "public"
            },
            {
                name: "tables",
                response: ["test"]
            },
            {
                name: "excludeProperties",
                response: false
            },
            {
                name: "renameAttributes",
                response: false
            },
            {
                name: "wasDerived",
                response: false
            },
            {
                name: "recordUnit",
                response: "test"
            },
            {
                name: "columnUnit",
                response: "test-unit"
            },
            {
                name: "columnUnit",
                response: "test-unit2"
            }
        ];

        let currentPromptIndex = 0;

        const jobExitMessage = await handleJobMessages(userAStreamingClient, successResponse.channelName,
            (message: JobMessageRequest) => {
              
                if(message.requestType === JobRequestType.PRINT) {
                    // console.log(message.message);
                } else if (message.requestType === JobRequestType.ERROR) {
                    console.log("Error: " + message.message);
                } else if(message.requestType === JobRequestType.PROMPT) {

                    const responses: ParameterAnswer<string> = {};        
                    
                    if(currentPromptIndex + message.prompts!.length > promptResponses.length)
                        throw new Error("Not enough prompt responses: " + message.prompts![0].name);

                    for(const prompt of message.prompts!) {
                        // console.log(prompt.message);

                        const currentPrompt = promptResponses[currentPromptIndex++];

                        if(prompt.name === currentPrompt.name) 
                            responses[prompt.name] = currentPrompt.response;
                        else
                            throw new Error("Unexpected prompt " + prompt.name);
                    }

                    const response =  new JobMessageResponse(JobRequestType.PROMPT);
                    response.answers = responses;

                    return response;
                }

                return undefined;

                
            });

        expect(jobExitMessage.exitCode).equal(0);

    });

    it("Modify database schema", async () => {
        const testData = fs.readFileSync(path.join("test","data-files","postgres-test-update.sql"));
        await postgresClient.query(testData.toString());
    })

    it("Run Update Package Job using websocket", async function() {

        let response = await new Promise<StartPackageUpdateResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(SocketEvent.START_PACKAGE_UPDATE, new StartPackageUpdateRequest({
                catalogSlug: "testA-ws-update-postgres",
                packageSlug: "test-postgres"
            }),(response: StartPackageUpdateResponse) => {
                resolve(response);
            });
        });

        expect(response.responseType).equal(SocketResponseType.START_PACKAGE_UPDATE_RESPONSE);

        const startPackageUpdateResponse:StartPackageUpdateResponse = response as StartPackageUpdateResponse;

        expect(startPackageUpdateResponse.channelName).not.equal(null);

        const channelName = startPackageUpdateResponse.channelName;

        expect(
            serverLogLines.find((l: any) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType == ActivityLogEventType.PACKAGE_UPDATE_JOB_STARTED &&
                        activityLogLine.username == "testA-ws-update-postgres" &&
                        activityLogLine.targetPackageIdentifier == "testA-ws-update-postgres/test-postgres" 
                    );
                })
            )
        ).to.be.not.undefined;
        

        const jobExitMessage = await handleJobMessages(userAStreamingClient, channelName);

        expect(jobExitMessage.exitCode).equal(0);


    });

    it("Package should be updated", async function() {
        const response = await userAClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-ws-update-postgres",
                    packageSlug: "test-postgres"
                }
            }
        });

        // console.log(JSON.stringify(JSON.parse(response.data.package.latestVersion?.packageFile),null,2));

        expect(response.data.package.latestVersion?.identifier.versionMajor).to.equal(2);
        expect(response.data.package.latestVersion?.identifier.versionMinor).to.equal(0);
        expect(response.data.package.latestVersion?.identifier.versionPatch).to.equal(0);
        
    })


});

async function handleJobMessages(client: Socket, channelName: string, messageHandler?: (message: JobMessageRequest) => JobMessageResponse | undefined): Promise<JobMessageRequest> {

    let exitCallback: (message:JobMessageRequest) => void | undefined;
    let disconnectCallBack: () => void | undefined;
    let errorCallback: (error: Error) => void | undefined;

    const disconnectPromise = new Promise<JobMessageRequest>((resolve, reject) => {
        disconnectCallBack = reject;
    });
        
    client.on(channelName, (message: JobMessageRequest, responseCallback:(response:any) => void) => {
        exitCallback(message);
        // console.log(JSON.stringify(message));

        if(message.requestType === JobRequestType.END_TASK) {
            responseCallback(new JobMessageResponse(JobRequestType.END_TASK));
        } else if(messageHandler) {

            try {
                const response = messageHandler(message);
                if(response) {
                    responseCallback(response);
                }
            } catch(error) {
                errorCallback(error);
            }


        }
    });    
    
    client.on("disconnect", () => {
        disconnectCallBack();
    })

    

    const jobExitPromise = new Promise<JobMessageRequest>((resolve, reject) => {

        exitCallback = (message: JobMessageRequest) => {

            if(message.requestType == JobRequestType.EXIT) {
        
                if(message.exitCode === 0) {
                    resolve(message);
                } else {
                    reject(new Error("Failed with exitCode: " + message.exitCode + " message: " + message.message));
                }
            }

        };

        errorCallback = (error: Error) => {
            reject(error);
        }

    });

    let startResponse = await new Promise<JobMessageResponse>((resolve,reject) => {
        client.emit(channelName, new JobMessageRequest(JobRequestType.START_JOB),(response: JobMessageResponse | ErrorResponse) => {

            if(response.responseType === SocketResponseType.ERROR) {
                reject(response as ErrorResponse);
            }

            resolve(response as JobMessageResponse);
        });

    });

    expect(startResponse.responseType).equal(JobRequestType.START_JOB);

    return Promise.race([disconnectPromise,jobExitPromise]);
}