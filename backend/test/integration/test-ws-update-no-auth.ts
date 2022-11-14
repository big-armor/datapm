/** Test's the ability for a client to run the Update Job */

import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreatePackageDocument,
    CreateVersionDocument,
    LoginDocument,
    ActivityLogEventType,
    PackageDocument
} from "./registry-client";
import {
    createAnonymousClient,
    createAnonymousStreamingClient,
    createAuthenicatedStreamingClient,
    createUser
} from "./test-utils";
import {
    loadPackageFileFromDisk,
    PublishMethod,
    StartPackageUpdateResponse,
    ErrorResponse,
    StartPackageUpdateRequest,
    SocketResponseType,
    SocketEvent,
    JobMessageResponse,
    JobMessageRequest,
    JobRequestType
} from "datapm-lib";
import { describe, it } from "mocha";
import { Socket } from "socket.io-client";
import { ActivityLogLine, dataServerPort, findActivityLogLine, serverLogLines } from "./setup";

/** Tests when the registry is used as a proxy for a published data package */
describe("Package Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    let userAToken = "Bearer ";
    let userBToken = "Bearer ";

    let anonymousStreamingClient: Socket;
    let userAStreamingClient: Socket;
    let userBStreamingClient: Socket;

    after(async () => {
        if (userAStreamingClient && userAStreamingClient.connected) {
            userAStreamingClient.close();
        }

        if (userBStreamingClient && userBStreamingClient.connected) {
            userBStreamingClient.close();
        }

        if (anonymousStreamingClient && anonymousStreamingClient.connected) {
            anonymousStreamingClient.close();
        }
    });

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-ws-update",
            "testA-ws-update@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-ws-update",
            "testB-ws-update@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);

        const userALogin = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testA-ws-update",
                password: "passwordA!"
            }
        });

        if (!userALogin.data?.login) {
            throw new Error("Authentication didn't work for user A");
        }

        const userBLogin = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testB-ws-update",
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
                    catalogSlug: "testA-ws-update",
                    packageSlug: "test-update",
                    displayName: "Test Update",
                    description: "Test of updating a package from the server through a websocket"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-ws-update");
        expect(response.data?.createPackage.description).to.equal(
            "Test of updating a package from the server through a websocket"
        );
        expect(response.data?.createPackage.displayName).to.equal("Test Update");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-ws-update");
        expect(response.data?.createPackage.identifier.packageSlug).to.equal("test-update");
        expect(response.data?.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish first version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/test-update-package.datapm.json");

        packageFileContents.registries = [
            {
                catalogSlug: "testA-ws-update",
                publishMethod: PublishMethod.SCHEMA_AND_DATA,
                url: "http://localhost:4200"
            }
        ];

        if (packageFileContents.sources[0].configuration === undefined) {
            throw new Error("Package file is missing configuration");
        }

        packageFileContents.sources[0].connectionConfiguration.uris = [
            "http://localhost:" + dataServerPort + "/update-test.csv"
        ];

        const packageFileString = JSON.stringify(packageFileContents);

        const response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-ws-update",
                    packageSlug: "test-update"
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.createVersion.author?.username).equal("testA-ws-update");
    });

    it("Connect to websocket for data uploads", async function () {
        anonymousStreamingClient = await createAnonymousStreamingClient();

        userAStreamingClient = await createAuthenicatedStreamingClient("testA-ws-update@test.datapm.io", "passwordA!");

        userBStreamingClient = await createAuthenicatedStreamingClient("testB-ws-update@test.datapm.io", "passwordB!");
    });

    it("Run Update Package Job using websocket", async function () {
        const response = await new Promise<StartPackageUpdateResponse | ErrorResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                SocketEvent.START_PACKAGE_UPDATE,
                new StartPackageUpdateRequest(
                    {
                        catalogSlug: "testA-ws-update",
                        packageSlug: "test-update"
                    },
                    false
                ),
                (response: StartPackageUpdateResponse) => {
                    resolve(response);
                }
            );
        });

        expect(response.responseType).equal(SocketResponseType.START_PACKAGE_UPDATE_RESPONSE);

        const startPackageUpdateResponse: StartPackageUpdateResponse = response as StartPackageUpdateResponse;

        expect(startPackageUpdateResponse.channelName).not.equal(null);

        const channelName = startPackageUpdateResponse.channelName;

        expect(
            serverLogLines.find((l: string) =>
                findActivityLogLine(l, (activityLogLine: ActivityLogLine) => {
                    return (
                        activityLogLine.eventType === ActivityLogEventType.PACKAGE_UPDATE_JOB_STARTED &&
                        activityLogLine.username === "testA-ws-update" &&
                        activityLogLine.targetPackageIdentifier === "testA-ws-update/test-update"
                    );
                })
            )
        ).to.not.equal(undefined);

        let messageCallback: (message: JobMessageRequest) => void | undefined;

        userAStreamingClient.on(
            channelName,
            (message: JobMessageRequest, callback: (response: JobMessageResponse) => void) => {
                messageCallback(message);
                // console.log(JSON.stringify(message));

                if (message.requestType === JobRequestType.END_TASK) {
                    callback(new JobMessageResponse(JobRequestType.END_TASK));
                }
            }
        );

        const jobExitPromise = new Promise<void>((resolve, reject) => {
            messageCallback = (message: JobMessageRequest) => {
                if (message.requestType === JobRequestType.EXIT) {
                    if (message.jobResult?.exitCode === 0) {
                        resolve();
                    } else {
                        reject(
                            new Error(
                                "Failed with exitCode: " + message.jobResult?.exitCode + " message: " + message.message
                            )
                        );
                    }
                }
            };
        });

        const startResponse = await new Promise<JobMessageResponse>((resolve, reject) => {
            userAStreamingClient.emit(
                channelName,
                new JobMessageRequest(JobRequestType.START_JOB),
                (response: JobMessageResponse | ErrorResponse) => {
                    if (response.responseType === SocketResponseType.ERROR) {
                        reject(new Error((response as ErrorResponse).message));
                    }

                    resolve(response as JobMessageResponse);
                }
            );
        });

        expect(startResponse.responseType).equal(JobRequestType.START_JOB);

        await jobExitPromise;
    });

    it("Package should be updated", async function () {
        const response = await userAClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-ws-update",
                    packageSlug: "test-update"
                }
            }
        });

        // console.log(JSON.stringify(JSON.parse(response.data.package.latestVersion?.packageFile),null,2));

        expect(response.data.package.latestVersion?.identifier.versionMajor).to.equal(2);
        expect(response.data.package.latestVersion?.identifier.versionMinor).to.equal(0);
        expect(response.data.package.latestVersion?.identifier.versionPatch).to.equal(0);
    });
});
