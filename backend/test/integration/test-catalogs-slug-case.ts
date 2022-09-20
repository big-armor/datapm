import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { CreateCatalogDocument, GetCatalogDocument } from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Catalog Slug Case Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-catalog-case",
            "testA-catalog-case@test.datapm.io",
            "passwordA!"
        );

        expect(userAClient).to.not.equal(undefined);
    });

    it("User A Create Second Catalog - cased slug", async function () {
        const response = await userAClient.mutate({
            mutation: CreateCatalogDocument,
            variables: {
                value: {
                    slug: "CaSeD-CaTaLoG",
                    displayName: "Cased catalog",
                    description: "This is a test for cased catalog requests",
                    website: "https://usera.datapm.io",
                    isPublic: false
                }
            }
        });

        expect(response.errors == null, "no errors returned").to.equal(true);

        expect(response.data?.createCatalog.identifier.catalogSlug, "correct slug").to.equal("CaSeD-CaTaLoG");
    });

    it("Get catalog no matter the case of catalog-slug", async function () {
        const response = await userAClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "cased-catalog"
                }
            }
        });

        expect(response.errors == null, "no errors returned").to.equal(true);

        expect(response.data?.catalog.identifier.catalogSlug, "correct slug").to.equal("CaSeD-CaTaLoG");
    });
});
