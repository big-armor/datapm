import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { CreatePackageDocument, CreateVersionDocument, LoginDocument } from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import request = require("superagent");
import { loadPackageFileFromDisk } from "datapm-lib";
import fs from "fs";
import { TEMP_STORAGE_PATH } from "./setup";

describe("Package Data Tests", async () => {
    const DATA_ENDPOINT_URL = "localhost:4000/data";

    const userAUsername = "legislatorA";
    const userBUsername = "legislatorB";

    let userAToken: string = "Bearer ";
    let userBToken: string = "Bearer ";

    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    before(async () => {});

    it("Create users A & B", async function () {
        const password = "passwordA!";
        userAClient = await createUser("FirstA", "LastA", userAUsername, "testA-data@test.datapm.io", password);

        userBClient = await createUser("FirstB", "LastB", userBUsername, "testB-data@test.datapm.io", password);

        const userALogin = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: userAUsername,
                password: password
            }
        });

        if (!userALogin.data?.login) {
            throw new Error("Authentication didn't work for user A");
        }

        const userBLogin = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: userBUsername,
                password: password
            }
        });

        if (!userBLogin.data?.login) {
            throw new Error("Authentication didn't work for user B");
        }

        userAToken += userALogin.data.login;
        userBToken += userBLogin.data.login;

        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Should not allow user to push data for package without edit permissions", async function () {
        const packageSlug = "legislators-1";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });
        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const version = "1.0.0";
        const url = `${DATA_ENDPOINT_URL}/${userAUsername}/${packageSlug}/${version}`;
        const dataRequest = request.post(url);
        const dataFile = fs.readFileSync("test/data-files/data.avro");

        dataRequest.set("Authorization", userBToken);
        dataRequest.send(dataFile);

        let threwException = false;
        dataRequest.catch(() => (threwException = true)).then(() => expect(threwException).equal(true));
    });

    it("Should allow user to push data for package with edit permissions", async function () {
        const packageSlug = "legislators-2";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });
        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const version = "1.0.0";
        const url = `${DATA_ENDPOINT_URL}/${userAUsername}/${packageSlug}/${version}`;

        const dataFile = fs.readFileSync("test/data-files/data.avro");
        const dataUploadResponse = await request.post(url).set("Authorization", userAToken).send(dataFile);

        expect(dataUploadResponse.status).equal(200);

        const storageLocation = `${TEMP_STORAGE_PATH}/data/${userAUsername}/${packageSlug}/${version}.avro`;
        const storedFile = fs.readFileSync(storageLocation).toString("base64");
        expect(dataFile.toString("base64")).equal(storedFile);
    });

    it("Should not allow storing data for invalid package", async function () {
        const packageSlug = "legislators-3";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });
        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const version = "1.0.0";
        const url = `${DATA_ENDPOINT_URL}/${userAUsername}/${packageSlug}-invalid/${version}`;

        const dataFile = fs.readFileSync("test/data-files/data.avro");
        const dataUploadRequest = request.post(url).set("Authorization", userAToken).send(dataFile);

        let threwException = false;
        dataUploadRequest.catch(() => (threwException = true)).then(() => expect(threwException).equal(true));
    });

    it("Should not allow user to download data for package without view permissions", async function () {
        const packageSlug = "legislators-4";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });
        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const version = "1.0.0";
        const url = `${DATA_ENDPOINT_URL}/${userAUsername}/${packageSlug}/${version}`;
        const dataFile = fs.readFileSync("test/data-files/data.avro");
        await request.post(url).set("Authorization", userAToken).send(dataFile);

        let threwException = false;
        request
            .get(url)
            .set("Authorization", userBToken)
            .catch(() => (threwException = true))
            .then(() => expect(threwException).equal(true));
    });

    it("Should allow user to download data for package with view permissions", async function () {
        const packageSlug = "legislators-5";

        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug,
                    displayName: "Congressional LegislatorsA",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });
        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        const packageFileString = JSON.stringify(packageFileContents);

        await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: userAUsername,
                    packageSlug: packageSlug
                },
                value: {
                    packageFile: packageFileString
                }
            }
        });

        const version = "1.0.0";
        const url = `${DATA_ENDPOINT_URL}/${userAUsername}/${packageSlug}/${version}`;
        const dataFile = fs.readFileSync("test/data-files/data.avro");
        await request.post(url).set("Authorization", userAToken).send(dataFile);

        const downloadResponse = await request.get(url).buffer(true).set("Authorization", userAToken);
        const downloadData = downloadResponse.body.toString("base64");
        expect(downloadData).equal(dataFile.toString("base64"));
    });

    it("Should not download any data for invalid packages", async function () {
        const packageSlug = "legislators-6";

        const version = "1.0.0";
        const url = `${DATA_ENDPOINT_URL}/${userAUsername}/${packageSlug}/${version}`;
        const dataDownloadRequest = request.get(url).buffer(true).set("Authorization", userAToken);

        let threwException = false;
        dataDownloadRequest.catch(() => (threwException = true)).then(() => expect(threwException).equal(true));
    });
});
