import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreatePackageDocument,
    UpdatePackageDocument,
    DisablePackageDocument,
    SearchPackagesDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";

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
