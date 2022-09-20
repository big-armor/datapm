import { expect } from "chai";
import {
    GroupDocument,
    AdminDeleteGroupDocument,
    AdminSearchGroupsDocument,
    CreateGroupDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import { AdminHolder } from "./admin-holder";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";

describe("Admin Tests", async () => {
    const anonymousClient: ApolloClient<NormalizedCacheObject> = createAnonymousClient();
    let nonAdminUserClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        nonAdminUserClient = await createUser(
            "NonAdminGroup",
            "NonAdminGroup",
            "NonAdminGroup",
            "NonAdminGroup@test.datapm.io",
            "passwordA!"
        );
    });
    beforeEach((done) => setTimeout(done, 100));

    it("Should create a group", async () => {
        const response = await nonAdminUserClient.query({
            query: CreateGroupDocument,
            variables: {
                name: "NonAdminGroup",
                description: "NonAdminGroup",
                groupSlug: "NonAdminGroup"
            }
        });

        expect(response.errors).to.equal(undefined);
    });

    it("Non admin can't search for group without restrictions", async () => {
        const groupSearchQuery = await nonAdminUserClient.query({
            query: AdminSearchGroupsDocument,
            variables: {
                limit: 1,
                offset: 0,
                value: "NonAdminGroup"
            }
        });

        expect(groupSearchQuery.errors?.some((error) => error.message.includes("NOT_AUTHORIZED"))).to.equal(true);
    });

    it("Admin can see private group data in admin search query", async () => {
        const groupsSearchResults = await AdminHolder.adminClient.query({
            query: AdminSearchGroupsDocument,
            variables: {
                limit: 1,
                offset: 0,
                value: "NonAdminGroup"
            }
        });

        const firstGroup = groupsSearchResults.data.adminSearchGroups.groups[0];
        expect(firstGroup?.name).to.equal("NonAdminGroup");
    });

    it("Non admin can't delete groups", async () => {
        const groupDeletion = await nonAdminUserClient.mutate({
            mutation: AdminDeleteGroupDocument,
            variables: {
                groupSlug: "NonAdminGroup"
            }
        });

        expect(groupDeletion.errors?.some((error) => error.message.includes("NOT_AUTHORIZED"))).to.equal(true);
    });

    it("Admin can delete groups", async () => {
        const response = await AdminHolder.adminClient.mutate({
            mutation: AdminDeleteGroupDocument,
            variables: {
                groupSlug: "NonAdminGroup"
            }
        });

        expect(response.errors).to.equal(undefined);

        const deletedGroupResponse = await AdminHolder.adminClient.query({
            query: GroupDocument,
            variables: {
                groupSlug: "NonAdminGroup"
            }
        });

        expect(deletedGroupResponse.errors?.some((error) => error.message.includes("GROUP_NOT_FOUND"))).to.equal(true);
    });
});
