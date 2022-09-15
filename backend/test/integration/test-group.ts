import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    AddOrUpdateUserToGroupDocument,
    CreateGroupDocument,
    MyGroupsDocument,
    Permission,
    RemoveUserFromGroupDocument,
    UpdateGroupDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

describe("Group tests", () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    before(async () => {
        userAClient = await createUser("FirstA", "LastA", "testA-group", "testA-group@test.datapm.io", "passwordA!");
        userBClient = await createUser("FirstB", "LastB", "testB-group", "testB-group@test.datapm.io", "passwordB!");
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Should create a group", async () => {
        const response = await userAClient.mutate({
            mutation: CreateGroupDocument,
            variables: {
                groupSlug: "test-group",
                name: "Test Group",
                description: "Test Group Description"
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("Should not be able to create create a group with the same slug", async () => {
        const response = await userAClient.mutate({
            mutation: CreateGroupDocument,
            variables: {
                groupSlug: "test-group",
                name: "Test Group2",
                description: "Test Group Description"
            }
        });

        expect(response.errors != null, "has errors").to.equal(true);

        if (response.errors == null) {
            throw new Error("expected errors");
        }
        expect(response.errors[0].message.startsWith("NOT_UNIQUE")).equal(true);
    });

    it("UserA should have all permissions", async () => {
        const response = await userAClient.query({
            query: MyGroupsDocument
        });

        expect(response.errors == null).equal(true);
        expect(response.data.myGroups.length).equal(1);
        expect(response.data.myGroups[0].slug).equal("test-group");
        expect(response.data.myGroups[0].myPermissions?.includes(Permission.VIEW)).equal(true);
        expect(response.data.myGroups[0].myPermissions?.includes(Permission.EDIT)).equal(true);
        expect(response.data.myGroups[0].myPermissions?.includes(Permission.MANAGE)).equal(true);
    });

    it("Should add userB to the group", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateUserToGroupDocument,
            variables: {
                groupSlug: "test-group",
                userPermissions: [
                    {
                        usernameOrEmailAddress: "testB-group",
                        permissions: [Permission.VIEW, Permission.EDIT]
                    }
                ]
            }
        });

        expect(response.errors == null, "no errors").to.equal(true);
    });

    it("UserB should have view and edit permissions", async () => {
        const response = await userBClient.query({
            query: MyGroupsDocument
        });

        expect(response.errors == null).equal(true);
        expect(response.data.myGroups.length).equal(1);
        expect(response.data.myGroups[0].slug).equal("test-group");
        expect(response.data.myGroups[0].myPermissions?.includes(Permission.VIEW)).equal(true);
        expect(response.data.myGroups[0].myPermissions?.includes(Permission.EDIT)).equal(true);
        expect(response.data.myGroups[0].myPermissions?.includes(Permission.MANAGE)).equal(false);
    });

    it("UserB should be able to edit group", async () => {
        const response = await userBClient.mutate({
            mutation: UpdateGroupDocument,
            variables: {
                groupSlug: "test-group",
                name: "New Name",
                description: "New Description"
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data?.updateGroup.name).equal("New Name");
    });

    it("UserB should not able able remove userA from the group", async () => {
        const response = await userBClient.mutate({
            mutation: RemoveUserFromGroupDocument,
            variables: {
                groupSlug: "test-group",
                username: "testA-group"
            }
        });

        expect(response.errors != null).equal(true);

        if (response.errors == null) {
            throw new Error("expected errors");
        }

        expect(response.errors[0].message).equal("NOT_AUTHORIZED");
    });

    it("Should remove userB from the group", async () => {
        const response = await userAClient.mutate({
            mutation: RemoveUserFromGroupDocument,
            variables: {
                groupSlug: "test-group",
                username: "testB-group"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("UserB should have no permission on the group", async () => {
        const response = await userBClient.query({
            query: MyGroupsDocument
        });

        expect(response.errors == null).equal(true);
        expect(response.data.myGroups.length).equal(0);
    });

    it("UserA should not be able to remove themselves from the group", async () => {
        const response = await userAClient.mutate({
            mutation: RemoveUserFromGroupDocument,
            variables: {
                groupSlug: "test-group",
                username: "testA-group"
            }
        });

        expect(response.errors != null).equal(true);

        if (response.errors == null) {
            throw new Error("expected errors");
        }

        expect(response.errors[0].message.startsWith("NOT_VALID")).eq(true);
    });

    it("UserA should not able to remove their own manager permission", async () => {
        const response = await userAClient.mutate({
            mutation: AddOrUpdateUserToGroupDocument,
            variables: {
                groupSlug: "test-group",
                userPermissions: [
                    {
                        usernameOrEmailAddress: "testA-group",
                        permissions: [Permission.VIEW]
                    }
                ]
            }
        });

        expect(response.errors != null).equal(true);

        if (response.errors == null) {
            throw new Error("expected errors");
        }

        expect(response.errors[0].message.startsWith("NOT_VALID")).eq(true);
    });
});
