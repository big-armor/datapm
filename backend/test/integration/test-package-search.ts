import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreatePackageDocument,
    UpdatePackageDocument,
    DeletePackageDocument,
    SearchPackagesDocument,
    CreateVersionDocument,
    UpdateCatalogDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import { loadPackageFileFromDisk, parsePackageFileJSON } from "datapm-lib";

describe("Package Search Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

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
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Should allow user to create a package", async function () {
        const response = await userAClient.mutate({
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
        expect(response.data?.createPackage.catalog?.displayName).to.equal("testA-packages-search");
        expect(response.data?.createPackage.description).to.equal("Test upload of congressional legislators");
        expect(response.data?.createPackage.displayName).to.equal("Congressional Legislators");
        expect(response.data?.createPackage.identifier.catalogSlug).to.equal("testA-packages-search");
        expect(response.data?.createPackage.identifier.packageSlug).to.equal("congressional-legislators");
        expect(response.data?.createPackage.latestVersion).to.equal(null);
    });

    it("User A publish first version", async function () {
        const packageFileContents = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");

        const packageFileString = JSON.stringify(packageFileContents);

        let response;
        try {
            response = await userAClient.mutate({
                mutation: CreateVersionDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-packages-search",
                        packageSlug: "congressional-legislators"
                    },
                    value: {
                        packageFile: packageFileString
                    }
                }
            });
        } catch (error) {
            console.error(JSON.stringify(error, null, 1));
            return;
        }

        expect(response.errors == null, "no errors").equal(true);
        expect(response.data?.createVersion.author?.username).equal("testA-packages-search");

        const responsePackageFileContents = response.data?.createVersion.packageFile;

        const packageFile = parsePackageFileJSON(responsePackageFileContents);

        expect(packageFile.readmeMarkdown).includes("This is where a readme might go");
        expect(packageFile.licenseMarkdown).includes("This is not a real license. Just a test.");
    });

    it("Should allow User A to search for package", async function () {
        const response = await userAClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 999,
                offset: 0,
                query: "congress"
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(
            response.data?.searchPackages.packages?.find((p) => p.identifier.catalogSlug === "testA-packages-search") !=
                null,
            "package returned"
        ).equal(true);

        if (response.data?.searchPackages.packages == null) {
            throw new Error("packages is null");
        }
        expect(response.data?.searchPackages.packages[0].displayName).to.equal("Congressional Legislators");
    });

    it("Should allow User A to search for package by README file content", async function () {
        const response = await userAClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 1000,
                offset: 0,
                query: "readme"
            }
        });

        expect(response.errors == null, "no errors").equal(true);

        const targetPackage = response.data?.searchPackages.packages?.find(
            (p) => p.identifier.catalogSlug === "testA-packages-search"
        );
        expect(targetPackage != null, "package returned").equal(true);

        if (targetPackage == null) {
            throw new Error("targetPackage is null");
        }

        expect(targetPackage.displayName).to.equal("Congressional Legislators");
    });

    it("Should not allow anonymous access to package", async function () {
        const response = await anonymousClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 999,
                offset: 0,
                query: "congress"
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(
            response.data?.searchPackages.packages?.find((p) => p.identifier.catalogSlug === "testA-packages-search") ==
                null,
            "package not returned"
        ).equal(true);
    });

    it("User A update catalog to be public", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages-search"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("User A set package public", async function () {
        const response = await userAClient.mutate({
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
        const response = await anonymousClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 999,
                offset: 0,
                query: "congress"
            }
        });
        expect(response.errors == null, "no errors").equal(true);
        const targetPackage = response.data?.searchPackages.packages?.find(
            (p) => p.identifier.catalogSlug === "testA-packages-search"
        );
        expect(targetPackage != null, "package returned").equal(true);

        if (targetPackage == null) {
            throw new Error("targetPackage is null");
        }

        expect(targetPackage.displayName).to.equal("Congressional Legislators");
    });

    it("User A delete package", async function () {
        const response = await userAClient.mutate({
            mutation: DeletePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-packages-search",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null, "no errors").equal(true);
    });

    it("Should not return package after delete", async function () {
        const response = await anonymousClient.query({
            query: SearchPackagesDocument,
            variables: {
                limit: 999,
                offset: 0,
                query: "congress"
            }
        });

        expect(response.errors == null, "no errors").equal(true);
        expect(
            response.data?.searchPackages.packages?.find((p) => p.identifier.catalogSlug === "testA-packages-search") ==
                null,
            "package not returned"
        ).equal(true);
    });
});
