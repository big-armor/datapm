import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreatePackageDocument,
    PackageDocument,
    UpdateCatalogDocument,
    UpdatePackageDocument,
    CreateVersionDocument,
    LoginDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import * as crypto from "crypto";
import { parsePackageFileJSON, loadPackageFileFromDisk, PublishMethod } from "datapm-lib";
import { describe, it } from "mocha";
import request = require("superagent");
import fs from 'fs';

/** Tests when the registry is used as a repository for the data of a package */
describe("Package Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    let userAToken: string = "Bearer ";
    let userBToken: string = "Bearer ";


    const slugUrlEncoded = encodeURIComponent("https://theunitedstates.io/congress-legislators/legislators-current.csv");

    before(async () => {});

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
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data!.createPackage.catalog?.displayName).to.equal("testA-registry-data");
        expect(response.data!.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data!.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data!.createPackage.identifier.catalogSlug).to.equal("testA-registry-data");
        expect(response.data!.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data!.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish first version", async function () {
        let packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

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
                    packageSlug: "congressional-legislators"
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

        expect(responsePackageFile.readmeMarkdown).includes("This is where a readme might go");
        expect(responsePackageFile.licenseMarkdown).includes("This is not a real license. Just a test.");

        expect(responsePackageFile.registries![0].publishMethod).equal(PublishMethod.SCHEMA_AND_DATA);
        expect(responsePackageFile.sources![0].type).equal("datapmRegistry");
        expect(responsePackageFile.sources![0].streamSets[0].slug).equal("https://theunitedstates.io/congress-legislators/legislators-current.csv");
        
        
    });

    it("Catalog not found", async function () {


        let errorCaught = false;
        try {
            const response = await request
            .options(`http://localhost:4000/data/incorrect-catalog-name/congressional-legislators/1.0.0/${slugUrlEncoded}/${slugUrlEncoded}`).buffer(true).send();
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(404);
            expect(e.response.text as string).include("CATALOG_NOT_FOUND");
        }

        expect(errorCaught).to.equal(true);

    });


    it("Package not found", async function () {

        let errorCaught = false;
        try {
            const response = await request
            .options(`http://localhost:4000/data/testA-registry-data/incorrect-package-name/1.0.0/${slugUrlEncoded}/${slugUrlEncoded}`).set("Authorization", userAToken).send();
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(404);
            expect(e.response.text as string).include("PACKAGE_NOT_FOUND");
        }

        expect(errorCaught).to.equal(true);



    });

    it("Source slug not found", async function () {

        let errorCaught = false;
        try {
            const response = await request
            .options(`http://localhost:4000/data/testA-registry-data/congressional-legislators/1.0.0/invalid-source-slug/${slugUrlEncoded}`).set("Authorization", userAToken).send();
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(404);
            expect(e.response.text as string).include("SOURCE_NOT_FOUND");
        }

        expect(errorCaught).to.equal(true);

    });

    it("Stream set slug not found", async function () {

        let errorCaught = false;
        try {
            const response = await request
            .options(`http://localhost:4000/data/testA-registry-data/congressional-legislators/1.0.0/${slugUrlEncoded}/invalid-stream-set`).set("Authorization", userAToken).send();
            console.log(JSON.stringify(response));
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(404);
            expect(e.response.text as string).include("STREAM_SET_NOT_FOUND");
        }

        expect(errorCaught).to.equal(true);

    });


    it("User A can upload avro data", async function () {

        const dataFile = fs.readFileSync("test/data-files/data.avro");
        const response = await request.post(`http://localhost:4000/data/testA-registry-data/congressional-legislators/1.0.0/${slugUrlEncoded}/${slugUrlEncoded}`)
            .set("Authorization", userAToken)
            .send(dataFile);

        expect(response.status).equal(200);

    });

    it("User without any permission can not upload data", async function () {

        const dataFile = fs.readFileSync("test/data-files/data.avro");

        let errorCaught = false;
        try {
            const response = await request.post(`http://localhost:4000/data/testA-registry-data/congressional-legislators/1.0.0/${slugUrlEncoded}/${slugUrlEncoded}`)
            .set("Authorization", userBToken)
            .send(dataFile);
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(401);
            expect(e.response.text as string).include("NOT_AUTHORIZED");
        }
    
        expect(errorCaught).to.equal(true);


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
                    packageSlug: "congressional-legislators"
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
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const responsePackageFileContents = response.data!.package.latestVersion!.packageFile;

        const responsePackageFile = parsePackageFileJSON(responsePackageFileContents);


        expect(responsePackageFile.sources.length).to.equal(1);
        expect(responsePackageFile.sources[0].type).equal("datapmRegistry");
        expect(responsePackageFile.sources[0].configuration!.catalogSlug).equal("testA-registry-data");
        expect(responsePackageFile.sources[0].configuration!.packageSlug).equal("congressional-legislators");
        expect(responsePackageFile.sources[0].streamSets[0].slug).equal("https://theunitedstates.io/congress-legislators/legislators-current.csv");
        expect(responsePackageFile.sources[0].streamSets[0].configuration.streamSetSlug).equal("https://theunitedstates.io/congress-legislators/legislators-current.csv");
        
    });


    it("User still without any permission can not upload data", async function () {

        const dataFile = fs.readFileSync("test/data-files/data.avro");

        let errorCaught = false;
        try {
            const response = await request.post(`http://localhost:4000/data/testA-registry-data/congressional-legislators/1.0.0/${slugUrlEncoded}/${slugUrlEncoded}`)
            .set("Authorization", userBToken)
            .send(dataFile);
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(401);
            expect(e.response.text as string).include("NOT_AUTHORIZED");
        }
    
        expect(errorCaught).to.equal(true);

    });

    
});
