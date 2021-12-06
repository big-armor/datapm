import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
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
import { createAnonymousClient, createUser } from "./test-utils";
import { parsePackageFileJSON, loadPackageFileFromDisk, PublishMethod } from "datapm-lib";
import { describe, it } from "mocha";
import request = require("superagent");
import fs, { exists } from 'fs';
import path from "path";
import { TEMP_STORAGE_PATH } from "./setup";
import { io, Socket } from "socket.io-client";


/** Tests when the registry is used as a repository for the data of a package */
describe("Package Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    let userAToken: string = "Bearer ";
    let userBToken: string = "Bearer ";

    let socket:Socket;

    before(async () => {});

    after(async () => {

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

    it("Connect to websocket for data uploads", async function(){

        /* socket = io("http://localhost:4000", {
            parser: require("socket.io-msgpack-parser"),
            transports: ["polling", "websocket"],
            auth: {
                token: registryConfiguration.apiKey
            }
        }); */
    });

    it("Catalog not found", async function () {

        

        


    });


    it("Package not found", async function () {

    });
    
    it("Schema not found", async function () {

      

    });

    it("User A can upload data", async function () {

    });

    it("User cannot upload data that isn't generated by datapm", async function () {


    });

    it("User cannot upload data that doesn't match the sheet", async function () {


    });

    it("User without any permission can not upload data", async function () {



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

    it("Anonymous user can download data", async function() {

       


    });

    it("User still without any permission can not upload data", async function () {



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

        const storageLocation = path.join(TEMP_STORAGE_PATH, 'data','testA-registry-data-2','simple','1','simple');

        // const files = fs.readdirSync(storageLocation);

        // expect(files.length).to.equal(1);

        // const file = files[0];

        // const storedFile = fs.readFileSync(storageLocation + path.sep +  file).toString("base64");

        // const originalFile = fs.readFileSync("simple.avro");
        // expect(originalFile.toString("base64")).equal(storedFile);

    })

    
});
