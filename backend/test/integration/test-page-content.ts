import { NormalizedCacheObject } from "@apollo/client/cache";
import { ApolloClient } from "@apollo/client/core";
import { expect } from "chai";
import { CreateCatalogDocument, CreatePackageDocument, GetPageContentDocument } from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

describe("Page Content Catalog", () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    before(async () => {});

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-page-content",
            "testA-page-content@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-page-content",
            "testB-page-content@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Should create a catalog", async function () {
        const response = await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    displayName: "Test Catalog",
                    description: "Test Catalog Description",
                    isPublic: false,
                    slug: "test-content-catalog"
                }
            }
        });

        expect(response.errors).to.not.exist;
        expect(response.data?.createCatalog).to.exist;
    });

    it("Should create a test package", async function () {
        await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "test-content-catalog",
                    packageSlug: "food-a",
                    displayName: "Congressional LegislatorsA",
                    description: "Test upload of congressional legislatorsA"
                }
            }
        });
    });

    it("Should return page content for for catalog", async function () {
        const result = await userAClient.query({
            query: GetPageContentDocument,
            variables: {
                route: "test-content-catalog"
            }
        });

        expect(result.data).to.exist;
        expect(result.data.pageContent).to.exist;
        expect(result.data.pageContent.catalog).to.exist;
        expect(result.data.pageContent.catalog?.packages).to.exist;

        expect(result.data.pageContent.catalog?.packages![0]?.identifier.packageSlug).to.equal("food-a");
    });

    it("Should return page content for user A ", async function () {
        const result = await userBClient.query({
            query: GetPageContentDocument,
            variables: {
                route: "testA-page-content"
            }
        });

        expect(result.data).to.exist;
        expect(result.data.pageContent).to.exist;
        expect(result.data.pageContent.user).to.exist;
        expect(result.data.pageContent.user?.username).to.equal("testA-page-content");
        expect(result.data.pageContent.user?.displayName).to.equal("testA-page-content");
    });
});
