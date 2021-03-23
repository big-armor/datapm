import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import {
    DeleteCatalogDocument,
    UpdateCatalogDocument,
    MyCatalogsDocument,
    MyCatalogsQuery,
    MyCatalogsQueryVariables,
    CreateCatalogDocument,
    GetCatalogDocument,
    CreatePackageDocument,
    UpdatePackageDocument,
    PackageDocument,
    CatalogPackagesDocument,
    CreateVersionDocument,
    UpdateMeDocument,
    Permission,
    UserCatalogsDocument,
    SetUserCatalogPermissionDocument,
    SetPackagePermissionsDocument,
    DeleteUserCatalogPermissionsDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("Catalog Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create usersA", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-catalog-case",
            "testA-catalog-case@test.datapm.io",
            "passwordA!"
        );

        expect(userAClient).to.exist;
    });

    it("User A Create Second Catalog - cased slug", async function () {
        let response = await userAClient.mutate({
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

        expect(response.errors! == null, "no errors returned").to.equal(true);

        expect(response.data!.createCatalog.identifier.catalogSlug, "correct slug").to.equal("CaSeD-CaTaLoG");
    });

    it("Get catalog no matter the case of catalog-slug", async function () {
        let response = await userAClient.query({
            query: GetCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "cased-catalog"
                }
            }
        });

        expect(response.errors == null, "no errors returned").to.equal(true);

        expect(response.data!.catalog.identifier.catalogSlug, "correct slug").to.equal("CaSeD-CaTaLoG");
    });
});
