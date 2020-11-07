import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreatePackageDocument,
    UpdatePackageDocument,
    DisablePackageDocument,
    SearchPackagesDocument,
    CreateVersionDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import fs from "fs";
import * as crypto from "crypto";

describe("Package Search Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    before(async () => {});

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-packages-search",
            "testA-packages-search@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-packages-search",
            "testB-packages-search@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Should allow user to create a package", async function () {
        let response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-packages-search",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
        expect(response.data!.createPackage.catalog.displayName).to.equal("testA-packages-search");
        expect(response.data!.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data!.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data!.createPackage.identifier.catalogSlug).to.equal("testA-packages-search");
        expect(response.data!.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data!.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish first version", async function () {
        let packageFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json", "utf8");
        let readmeFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.README.md", "utf8");
        let licenseFileContents = fs.readFileSync("test/packageFiles/congressional-legislators.LICENSE.md", "utf8");

        let hash = crypto.createHash("sha256").update(packageFileContents, "utf8").digest("hex");
        let response = await userAClient.mutate({
            mutation: CreateVersionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages-search",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    packageFile: packageFileContents,
                    licenseFile: licenseFileContents,
                    readmeFile: readmeFileContents
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.createVersion.author.username).equal("testA-packages-search");

        const responsePackageFileContents = response.data!.createVersion.packageFile;

        const responseHash = crypto.createHash("sha256").update(responsePackageFileContents, "utf8").digest("hex");

        // have to update this hash value if the package file contents change
        expect(responseHash).equal("7b099af18acd06ce94b3e13dcb1feb0a6637764b2cc4b6cac27e52f8267caf16");

        expect(response.data!.createVersion.readmeFile!).contains("This is where a readme might go");
        expect(response.data!.createVersion.licenseFile!).contains("This is not a real license. Just a test.");
    });

    it("Should allow User A to search for package", async function () {
        let response = await userAClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congress"
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(
            response.data!.searchPackages.packages!.find((p) => p.identifier.catalogSlug == "testA-packages-search") !=
                null,
            "package returned"
        ).true;
        expect(response.data!.searchPackages.packages![0].displayName).to.equal("Congressional Legislators");
    });

    it("Should allow User A to search for package by README file content", async function () {
        let response = await userAClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "readme"
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(
            response.data!.searchPackages.packages!.find((p) => p.identifier.catalogSlug == "testA-packages-search") !=
                null,
            "package returned"
        ).true;
        expect(response.data!.searchPackages.packages![0].displayName).to.equal("Congressional Legislators");
    });

    it("Should not allow anonymous access to package", async function () {
        let response = await anonymousClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congress"
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(
            response.data!.searchPackages.packages!.find((p) => p.identifier.catalogSlug == "testA-packages-search") ==
                null,
            "package not returned"
        ).true;
    });

    it("User A set package public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages-search",
                    packageSlug: "congressional-legislators"
                },
                value: {
                    isPublic: true
                }
            }
        });
        expect(response.errors == null, "no errors").equal(true);
    });

    it("Should allow anonymous search package", async function () {
        let response = await anonymousClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congress"
            }
        });
        expect(response.errors == null, "no errors").true;
        let targetPackage = response.data!.searchPackages.packages!.find(
            (p) => p.identifier.catalogSlug == "testA-packages-search"
        );
        expect(targetPackage != null, "package returned").true;
        expect(targetPackage!.displayName).to.equal("Congressional Legislators");
    });

    it("User A delete package", async function () {
        let response = await userAClient.mutate({
            mutation: DisablePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages-search",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.disablePackage.identifier.packageSlug.startsWith("congressional-legislators-DISABLED-"))
            .true;
    });

    it("Should not return package after delete", async function () {
        let response = await anonymousClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 10,
                offset: 0,
                query: "congress"
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(
            response.data!.searchPackages.packages!.find((p) => p.identifier.catalogSlug == "testA-packages-search") ==
                null,
            "package not returned"
        ).true;
    });
});
