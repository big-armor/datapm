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
import csvParser from "csv-parse/lib/sync";
import { DPM_AVRO_DOC_URL_V1, parsePackageFileJSON, loadPackageFileFromDisk, PublishMethod, base62, toAvroPropertyName } from "datapm-lib";
import { describe, it } from "mocha";
import request = require("superagent");
import fs, { exists } from 'fs';
import avro from "avsc";


/** Tests when the registry is used as a repository for the data of a package */
describe("Package Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    let userAToken: string = "Bearer ";
    let userBToken: string = "Bearer ";


    before(async () => {});

    after(async () => {

        if(fs.existsSync("test-download.avro"))
            fs.unlinkSync("test-download.avro");

        if(fs.existsSync("simple.avro"))
            fs.unlinkSync("simple.avro");

        if(fs.existsSync("test-bad-data.avro"))
            fs.unlinkSync("test-bad-data.avro");

        if(fs.existsSync("test-bad-schema.schema.json"))
            fs.unlinkSync("test-bad-schema.schema.json");
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

    it("Catalog not found", async function () {


        let errorCaught = false;
        try {
            const response = await request
            .options(`http://localhost:4000/data/incorrect-catalog-name/simple/1.0.0/file/simple`).buffer(true).send();
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
            .options(`http://localhost:4000/data/testA-registry-data/incorrect-package-name/1.0.0/file/simple`).set("Authorization", userAToken).send();
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
            .options(`http://localhost:4000/data/testA-registry-data/simple/1.0.0/invalid-source-slug/simple`).set("Authorization", userAToken).send();
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
            .options(`http://localhost:4000/data/testA-registry-data/simple/1.0.0/file/invalid-stream-set`).set("Authorization", userAToken).send();
            console.log(JSON.stringify(response));
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(404);
            expect(e.response.text as string).include("SCHEMA_NOT_FOUND");
        }

        expect(errorCaught).to.equal(true);

    });


    it("Create a test avro file", async function(){


        const csvFile = fs.readFileSync("test/data-files/simple/simple.csv");
        
        const values = csvParser(csvFile,{
            delimiter: ",",
            columns: true,
        }) as {}[];

        const avroEncoder = avro.createFileEncoder("./simple.avro", 
        {
            type: "record",
            name: "simple",
            doc: DPM_AVRO_DOC_URL_V1,
            fields: 
                [
                    {
                        name: "dpm_a2v1pU4V_string",
                        type: "string"
                    },
                    {
                        name: "dpm_YUCnH7eU_number_int",
                        type: ["int","null"]
                    },
                    {
                        name: "dpm_YUCnH7eU_number_double",
                        type: ["double","null"]
                    },
                    {
                        name: "dpm_22tiXZ5XlW_boolean",
                        type: "boolean"
                    },
                    {
                        name: "dpm_1pyLWX_date",
                        type: "long",
                    },
                    {
                        name: "dpm_8cK5WDEvXG9_datetime",
                        type: "long"
                    },
                    {
                        name: "dpm_BFmVA6pEofQIqsV_string",
                        type: ["string","null"]
                    }
                        
                ]
        });

        await new Promise<void>((resolve,reject) => {
            avroEncoder.write({
                dpm_a2v1pU4V_string: "hey",
                dpm_YUCnH7eU_number_int: 1,
                dpm_YUCnH7eU_number_double: null,
                dpm_22tiXZ5XlW_boolean: true,
                dpm_1pyLWX_date: 1631631962,
                dpm_8cK5WDEvXG9_datetime: 1631629762,
                dpm_BFmVA6pEofQIqsV_string: null
            }, undefined, (error) => {
                if(error)
                    reject(error);
                else resolve();
            });
        });

        await new Promise<void>((resolve,reject) => {
            avroEncoder.write({
                dpm_a2v1pU4V_string: "yo",
                dpm_YUCnH7eU_number_int: null,
                dpm_YUCnH7eU_number_double: 2.2,
                dpm_22tiXZ5XlW_boolean: false,
                dpm_1pyLWX_date: 1631630962,
                dpm_8cK5WDEvXG9_datetime: 1621629762,
                dpm_BFmVA6pEofQIqsV_string: "something something dark side"
            }, undefined, (error) => {
                if(error)
                    reject(error);
                else resolve();
            });
        });

        await new Promise((resolve,reject) => {avroEncoder.end(resolve)});



    });


    it("User A can upload avro data", async function () {

        const dataFile = fs.readFileSync("./simple.avro");
        const response = await request.post(`http://localhost:4000/data/testA-registry-data/simple/1.0.0/file/simple`)
            .set("Authorization", userAToken)
            .send(dataFile);

        expect(response.status).equal(200);

    });

    it("User cannot upload avro data that isn't generated by datapm", async function () {

        let errorCaught = false;
        try {

            const dataFile = fs.readFileSync("test/data-files/start-small-donations.avro");
            const response = await request.post(`http://localhost:4000/data/testA-registry-data/simple/1.0.0/file/simple`)
                .set("Authorization", userAToken)
                .send(dataFile);
            console.log(JSON.stringify(response));
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(400);
            expect(e.response.text as string).include("AVRO_DOC_VALUE_NOT_RECOGNIZED");
        }

        expect(errorCaught).to.equal(true);

    });

    it("User cannot upload avro data that doesn't match the sheet", async function () {


        const avroEncoder = avro.createFileEncoder("./test-bad-schema.avro", 
        {
            type: "record",
            name: "simple",
            doc: DPM_AVRO_DOC_URL_V1,
            fields: 
                [
                    {
                        name: "dpm_289lyu_string",
                        type: "string"
                    }
                        
                ]
        });

        await new Promise<void>((resolve,reject) => {
            avroEncoder.write({
                dpm_289lyu_string: "hey"
            }, undefined, (error) => {
                if(error)
                    reject(error);
                else resolve();
            });
        });

        await new Promise((resolve,reject) => {avroEncoder.end(resolve)});

        await new Promise((resolve,reject) => {setTimeout(resolve,500)});
        
        let errorCaught = false;
        try {

            const dataFile = fs.readFileSync("test-bad-schema.avro");
            const response = await request.post(`http://localhost:4000/data/testA-registry-data/simple/1.0.0/file/simple`)
                .set("Authorization", userAToken)
                .send(dataFile);
            console.log(JSON.stringify(response));
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(400);
            expect(e.response.text as string).include("FIELD_NOT_PRESENT_IN_SCHEMA");
        }

        expect(errorCaught).to.equal(true);

    });

    it("User without any permission can not upload data", async function () {

        const dataFile = fs.readFileSync("test/data-files/data.avro");

        let errorCaught = false;
        try {
            const response = await request.post(`http://localhost:4000/data/testA-registry-data/simple/1.0.0/file/simple`)
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


    it("Anonymous user can not download data", async function() {

        let errorCaught = false;
        try {
            const req = await request.get(`http://localhost:4000/data/testA-registry-data/simple/1.0.0/file/simple`).send();
        } catch (e) {
            errorCaught = true;
            expect(e.status).equal(401);
            expect(e.response.text as string).include("NOT_AUTHORIZED");
        }
    
        expect(errorCaught).to.equal(true);


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
        expect(responsePackageFile.sources[0].streamSets[0].slug).equal("simple");
        expect(responsePackageFile.sources[0].streamSets[0].configuration.streamSetSlug).equal("simple");
        
    });

    it("Anonymous user can download data", async function() {

        const req = request.get(`http://localhost:4000/data/testA-registry-data/simple/1.0.0/file/simple`).buffer(false);

        req.on('response', function(response:request.Response) {
            if (response.status !== 200) {
                req.abort();
            }
        }).pipe(fs.createWriteStream("./test-download.avro"));



    });

    it("User still without any permission can not upload data", async function () {

        const dataFile = fs.readFileSync("test/data-files/data.avro");

        let errorCaught = false;
        try {
            const response = await request.post(`http://localhost:4000/data/testA-registry-data/simple/1.0.0/file/simple`)
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
