import { ApolloClient, FetchResult, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { expect } from "chai";
import {
    MeDocument,
    UserDocument,
    UpdateMeDocument,
    LoginMutation,
    SearchUsersDocument,
    SetAsAdminDocument,
    DeleteUserDocument,
    SearchUsersAsAdminDocument
} from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";
import { AdminHolder } from "./admin-holder";

describe("User Tests", async () => {
    before(async () => {});

    it("Non admin can't search for users without restrictions", async function () {
        const nonAdminUser = await createUser(
            "NonAdmin",
            "NonAdmin",
            "NonAdmin",
            "NonAdmin@test.datapm.io",
            "passwordA!"
        );
        const userSearchQuery = await nonAdminUser.query({
            query: SearchUsersAsAdminDocument,
            variables: {
                limit: 1,
                offset: 0,
                value: "UserWithPrivateDataB"
            }
        });

        expect(userSearchQuery.errors?.some((error) => error.message.includes("NOT_AUTHORIZED"))).to.be.true;
    });

    it("Non admin can't delete users", async function () {
        await createUser(
            "UserToTryToDelete",
            "UserToTryToDelete",
            "UserToTryToDelete",
            "UserToTryToDelete@test.datapm.io",
            "passwordB!"
        );
        const nonAdminUser = await createUser(
            "NonAdmin2",
            "NonAdmin2",
            "NonAdmin2",
            "NonAdmin2@test.datapm.io",
            "passwordA!"
        );
        const userDeletion = await nonAdminUser.mutate({
            mutation: DeleteUserDocument,
            variables: {
                username: "UserToTryToDelete"
            }
        });

        expect(userDeletion.errors?.some((error) => error.message.includes("NOT_AUTHORIZED"))).to.be.true;
    });

    it("Admin can delete users", async function () {
        await createUser("UserToDelete", "UserToDelete", "UserToDelete", "UserToDelete@test.datapm.io", "passwordB!");
        await AdminHolder.adminClient.mutate({
            mutation: DeleteUserDocument,
            variables: {
                username: "UserToDelete"
            }
        });

        const deletedUserResponse = await AdminHolder.adminClient.query({
            query: UserDocument,
            variables: {
                username: "UserToDelete"
            }
        });

        expect(deletedUserResponse.errors?.some((error) => error.message.includes("USER_NOT_FOUND"))).to.be.true;
    });

    it("Admin can see private user data in admin search query", async function () {
        await createUser(
            "UserAFirstName",
            "UserALastName",
            "UserWithPrivateData",
            "UserWithPrivateData@test.datapm.io",
            "passwordB!"
        );
        const usersSearchResults = await AdminHolder.adminClient.query({
            query: SearchUsersAsAdminDocument,
            variables: {
                limit: 1,
                offset: 0,
                value: "UserWithPrivateData"
            }
        });

        const firstUser = usersSearchResults.data.searchUsersAsAdmin.users[0];
        expect(firstUser?.firstName).to.equal("UserAFirstName");
    });

    it("Admin can't see private user data in non-admin search query", async function () {
        await createUser(
            "UserBFirstName",
            "UserBLastName",
            "UserWithPrivateDataB",
            "UserWithPrivateDataB@test.datapm.io",
            "passwordB!"
        );
        const usersSearchResults = await AdminHolder.adminClient.query({
            query: SearchUsersDocument,
            variables: {
                limit: 1,
                offset: 0,
                value: "UserWithPrivateDataB"
            }
        });

        const firstUser = usersSearchResults.data.searchUsers.users[0];
        expect(firstUser?.firstName).to.be.undefined;
    });
});
