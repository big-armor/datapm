import { expect } from "chai";
import {
    UserDocument,
    SearchUsersDocument,
    AdminDeleteUserDocument,
    AdminSearchUsersDocument,
    AdminSetUserStatusDocument,
    UserStatus,
    LoginDocument,
    AUTHENTICATION_ERROR,
    MeDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";
import { AdminHolder } from "./admin-holder";
import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";

describe("Admin Tests", async () => {
    const anonymousClient: ApolloClient<NormalizedCacheObject> = createAnonymousClient();
    let nonAdminUserClient: ApolloClient<NormalizedCacheObject>;

    beforeEach((done) => setTimeout(done, 100));

    it("Non admin can't search for users without restrictions", async () => {
        const nonAdminUser = await createUser(
            "NonAdmin",
            "NonAdmin",
            "NonAdmin",
            "NonAdmin@test.datapm.io",
            "passwordA!"
        );
        const userSearchQuery = await nonAdminUser.query({
            query: AdminSearchUsersDocument,
            variables: {
                limit: 1,
                offset: 0,
                value: "UserWithPrivateDataB"
            }
        });

        expect(userSearchQuery.errors?.some((error) => error.message.includes("NOT_AUTHORIZED"))).to.equal(true);
    });

    it("Non admin can't suspend users", async () => {
        nonAdminUserClient = await createUser(
            "NonAdminSuspender",
            "NonAdminSuspender",
            "NonAdminSuspender",
            "NonAdminSuspender@test.datapm.io",
            "passwordA!"
        );
        const userStatusChangeResult = await nonAdminUserClient.mutate({
            mutation: AdminSetUserStatusDocument,
            variables: {
                username: "NonAdmin",
                status: UserStatus.SUSPENDED,
                message: "You've been a bad user"
            }
        });

        expect(userStatusChangeResult.errors?.some((error) => error.message.includes("NOT_AUTHORIZED"))).to.equal(true);
    });

    it("Admin can suspend users", async () => {
        const userStatusChangeResult = await AdminHolder.adminClient.mutate({
            mutation: AdminSetUserStatusDocument,
            variables: {
                username: "NonAdminSuspender",
                status: UserStatus.SUSPENDED,
                message: "You've been a bad user"
            }
        });

        expect(userStatusChangeResult.errors).to.equal(undefined);
    });

    it("Suspended user can't do queries that require valid authentication", async () => {
        const meResponse = await nonAdminUserClient.query({
            query: MeDocument
        });

        expect(
            meResponse.errors?.some((error) => error.message.includes(AUTHENTICATION_ERROR.ACCOUNT_SUSPENDED))
        ).to.equal(true);
    });

    it("Suspended user can't login", async () => {
        const loginResponse = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "NonAdminSuspender",
                password: "passwordA!"
            }
        });

        expect(
            loginResponse.errors?.some((error) => error.message.includes(AUTHENTICATION_ERROR.ACCOUNT_SUSPENDED))
        ).to.equal(true);
    });

    it("Non admin can't delete users", async () => {
        const nonAdminUser = await createUser(
            "NonAdmin2",
            "NonAdmin2",
            "NonAdmin2",
            "NonAdmin2@test.datapm.io",
            "passwordA!"
        );

        const userDeletion = await nonAdminUser.mutate({
            mutation: AdminDeleteUserDocument,
            variables: {
                usernameOrEmailAddress: "UserToTryToDelete"
            }
        });

        expect(userDeletion.errors?.some((error) => error.message.includes("NOT_AUTHORIZED"))).to.equal(true);
    });

    it("Admin can delete users", async () => {
        await createUser("UserToDelete", "UserToDelete", "UserToDelete", "UserToDelete@test.datapm.io", "passwordB!");
        await AdminHolder.adminClient.mutate({
            mutation: AdminDeleteUserDocument,
            variables: {
                usernameOrEmailAddress: "UserToDelete"
            }
        });

        const deletedUserResponse = await AdminHolder.adminClient.query({
            query: UserDocument,
            variables: {
                username: "UserToDelete"
            }
        });

        expect(deletedUserResponse.errors?.some((error) => error.message.includes("USER_NOT_FOUND"))).to.equal(true);
    });

    it("Admin can see private user data in admin search query", async () => {
        await createUser(
            "UserAFirstName",
            "UserALastName",
            "UserWithPrivateData",
            "UserWithPrivateData@test.datapm.io",
            "passwordB!"
        );
        const usersSearchResults = await AdminHolder.adminClient.query({
            query: AdminSearchUsersDocument,
            variables: {
                limit: 1,
                offset: 0,
                value: "UserWithPrivateData"
            }
        });

        const firstUser = usersSearchResults.data.adminSearchUsers.users[0];
        expect(firstUser?.firstName).to.equal("UserAFirstName");
    });

    it("Admin can't see private user data in non-admin search query", async () => {
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
        expect(firstUser?.firstName).to.equal(undefined);
    });
});
