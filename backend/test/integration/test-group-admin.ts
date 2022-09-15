import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { describe } from "mocha";
import { AdminHolder } from "./admin-holder";
import {
    AddOrUpdateUserToGroupDocument,
    AdminSearchUsersDocument,
    CreateGroupDocument,
    MeDocument,
    Permission,
    SetGroupAsAdminDocument
} from "./registry-client";
import { createUser } from "./test-utils";

describe("Group Admin", () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-group-admin",
            "testA-group-admin@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-group-admin",
            "testB-group-admin@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Should create a group", async () => {
        const response = await AdminHolder.adminClient.mutate({
            mutation: CreateGroupDocument,
            variables: {
                description: "Test group",
                name: "Test Group",
                groupSlug: "test-admin-group"
            }
        });

        expect(response).to.not.equal(undefined);
        expect(response.errors).to.equal(undefined);
    });

    it("Should add userA to group", async () => {
        const response = await AdminHolder.adminClient.mutate({
            mutation: AddOrUpdateUserToGroupDocument,
            variables: {
                groupSlug: "test-admin-group",
                userPermissions: [{ permissions: [Permission.VIEW], usernameOrEmailAddress: "testA-group-admin" }]
            }
        });
    });

    it("UserA should not be an admin", async () => {
        const response = await userAClient.query({
            query: MeDocument
        });
        expect(response.data.me.isAdmin).equal(false);
    });

    it("Set group admin", async () => {
        const response = await AdminHolder.adminClient.mutate({
            mutation: SetGroupAsAdminDocument,
            variables: {
                groupSlug: "test-admin-group",
                isAdmin: true
            }
        });

        expect(response.errors).to.equal(undefined);
    });

    it("UserA should be admin", async () => {
        const response = await userAClient.query({
            query: MeDocument
        });
        expect(response.data.me.isAdmin).equal(true);
    });

    it("UserA should be able to perform admin action", async () => {
        const response = await userAClient.query({
            query: AdminSearchUsersDocument,
            variables: {
                limit: 10,
                offset: 0,
                value: "FirstA"
            }
        });

        expect(response.errors).to.equal(undefined);
        expect(response.data.adminSearchUsers.count).greaterThan(0);
    });

    it("Remove group admin access", async () => {
        const response = await userAClient.mutate({
            mutation: SetGroupAsAdminDocument,
            variables: {
                groupSlug: "test-admin-group",
                isAdmin: false
            }
        });

        expect(response.errors).to.equal(undefined);
    });

    it("UserA should not be admin", async () => {
        const response = await userAClient.query({
            query: MeDocument
        });
        expect(response.data.me.isAdmin).equal(false);
    });
});
