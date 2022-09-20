import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    CreatePackageDocument,
    MeDocument,
    MyRecentlyViewedPackagesDocument,
    PackageDocument,
    User
} from "./registry-client";
import { createUser } from "./test-utils";

describe("Recently Viewed", async () => {
    let userOne: User;
    let userTwo: User;
    let userOneClient: ApolloClient<NormalizedCacheObject>;
    let userTwoClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        userOneClient = await createUser(
            "FirstOne",
            "LastOne",
            "testOne-recently-viewed",
            "testOne-recently-viewed@test.datapm.io",
            "passwordOne!"
        );
        userTwoClient = await createUser(
            "FirstTwo",
            "LastTwo",
            "testTwo-recently-viewed",
            "testTwo-recently-viewed@test.datapm.io",
            "passwordTwo!"
        );

        const userOneResponse = await userOneClient.query({
            query: MeDocument
        });

        const userTwoResponse = await userTwoClient.query({
            query: MeDocument
        });

        userOne = userOneResponse.data?.me.user;
        userTwo = userTwoResponse.data?.me.user;
    });

    it("Create test package", async function () {
        const createPackageResponse = await userOneClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testOne-recently-viewed",
                    packageSlug: "congressional-legislators",
                    displayName: "Congressional Legislators",
                    description: "Test upload of congressional legislators"
                }
            }
        });

        expect(createPackageResponse.errors == null).to.equal(true);
    });

    it("View package", async function () {
        const response = await userOneClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-recently-viewed",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(response.errors == null).to.equal(true);

        const responseTwo = await userOneClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testOne-recently-viewed",
                    packageSlug: "congressional-legislators"
                }
            }
        });

        expect(responseTwo.errors == null).to.equal(true);
    });

    it("Should return the package in recently viewed", async function () {
        const response = await userOneClient.query({
            query: MyRecentlyViewedPackagesDocument,
            variables: {
                limit: 10,
                offset: 0
            }
        });

        expect(response.errors == null).to.equal(true);
        expect(response.data.myRecentlyViewedPackages.logs?.length === 1).to.equal(true);
        expect(
            response.data.myRecentlyViewedPackages.logs[0].targetPackage?.identifier.catalogSlug ===
                "testOne-recently-viewed"
        ).to.equal(true);
        expect(
            response.data.myRecentlyViewedPackages.logs[0].targetPackage?.identifier.packageSlug ===
                "congressional-legislators"
        ).to.equal(true);
    });
});
