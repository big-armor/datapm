import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    AutoCompleteDocument,
    CreateCollectionDocument,
    CreatePackageDocument,
    UpdateMeDocument,
    MeDocument,
    UpdatePackageDocument
} from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Autocomplete tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "AAuto",
            "ACompletely",
            "userA-auto-complete-test",
            "Aemailautocomplete@test.datapm.io",
            "autoPassword1!"
        );
        userBClient = await createUser(
            "BAuta",
            "BCompletely",
            "userB-auto-complete-test",
            "Bemailautocomplete@test.datapm.io",
            "autoPassward2!"
        );
        await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    nameIsPublic: true
                }
            }
        });
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Creates inital packages and collections for search queries", async function () {
        let createCollection = await userAClient.mutate({
            mutation: CreateCollectionDocument,
            variables: {
                value: {
                    collectionSlug: "collection-auto-complete-testA",
                    name: "Collection Auto Complete Test v1",
                    description: "This is a test collection for auto-complete test purposes"
                }
            }
        });

        let createPackage = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "catalog-auto-complete-testA",
                    packageSlug: "package-auto-complete-v1",
                    displayName: "Package Auto Complete Test v1",
                    description: "This is a test package for auto-complete test purposes"
                }
            }
        });

        expect(createCollection.errors! == null);
        expect(createPackage.errors! == null);
    });

    it("Should return packages by slug", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "package-au"
            }
        });

        console.log("======== Should return packages by slug ========");
        console.log(response);
        console.log("packages: ", response.data?.autoComplete?.packages);
    });

    it("Should return packages display name", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Package Au"
            }
        });
        console.log("======== Should return packages display name =======");

        console.log("packages: ", response.data?.autoComplete?.packages);
        // debugger;

        // expect(response.data?.autoComplete.packages).to.equal(1);
        // expect(response.data?.autoComplete?.packages);
    });

    it("Should return packages by description vectors", async function () {});

    it("Should return packages readme vectors", async function () {});

    it("Should return collections by slug", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "collection-au"
            }
        });
        console.log("========= Collection Should return collections by slug =========");
        console.log(response);
    });

    it("Should return collections by display name", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "Collection Au"
            }
        });
        console.log("========= Collection Should return collections by display name =========");
        console.log(response);
    });

    it("Should return collections description vectors", async function () {});

    it("Should return users by username", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "userA"
            }
        });
        console.log("========= USER Should return users by username =========");
        console.log(response.data?.autoComplete);
    });

    it("Should return users by first or last name", async function () {
        let firstName = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "AAut"
            }
        });
        let lastName = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "ACompl"
            }
        });
        console.log("==== USER Should return users by first or last name =====");
        console.log("firstName: ", firstName.data?.autoComplete);
        console.log("lastName: ", lastName.data?.autoComplete);
    });

    it("Should return users by email address", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "emailA"
            }
        });
        console.log("========= USER Should return users by email address =========");

        console.log(response.data?.autoComplete);
    });

    it("Should return users only if nameIsPublic", async function () {
        let response = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: "s"
            }
        });

        // await userAClient.mutate({
        //     mutation: UpdateMeDocument,
        //     variables: {
        //         value: {
        //             nameIsPublic: false
        //         }
        //     }
        // });

        // await userAClient.mutate({
        //     mutation: UpdateMeDocument,
        //     variables: {
        //         value: {
        //             emailAddressIsPublic: false
        //         }
        //     }
        // });

        console.log("========= USER Should return users only if nameIsPublic =========");

        console.log(response.data?.autoComplete);
    });

    it("Should return users only if emailAddressIsPublic", async function () {
        let before = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: ""
            }
        });

        let after = await userAClient.query({
            query: AutoCompleteDocument,
            variables: {
                startsWith: ""
            }
        });

        // console.log(response.data?.autoComplete);
    });
});
