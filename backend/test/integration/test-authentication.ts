import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import { AUTHENTICATION_ERROR, LoginDocument, UpdateMyPasswordDocument } from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";
import { describe, it } from "mocha";

describe("Authentication Tests", async () => {
    const anonymousClient: ApolloClient<NormalizedCacheObject> = createAnonymousClient();
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        expect(anonymousClient).to.not.equal(undefined);
    });

    it("Login for incorrect user should fail", async () => {
        const result = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "test",
                password: "test1234!"
            }
        });

        expect(
            result.errors?.find((e) => e.message === AUTHENTICATION_ERROR.WRONG_CREDENTIALS) != null,
            "should have invalid login error"
        ).equal(true);
    });

    it("Password too short test", async function () {
        let errorFound = false;
        await createUser("Password", "TooShort", "willFail", "fail@fail.com", "abcdefg")
            .catch((error: ErrorResponse) => {
                const fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find(
                                (s) => s === "ValidationError: PASSWORD_TOO_SHORT"
                            ) != null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "Password was too short error not found").equal(true);
            });
    });

    it("Password too long test", async function () {
        let errorFound = false;
        await createUser(
            "Password",
            "TooLong",
            "willFail",
            "fail@fail.com",
            "abcasdfasdfasdfasdfadsfasdfasdfasdfasdfwadsfasdfasdfasdfasdfasdfasdfadsfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf"
        )
            .catch((error) => {
                const fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find((s) => s === "ValidationError: PASSWORD_TOO_LONG") !=
                            null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "PASSWORD_TOO_LONG error not returned").equal(true);
            });
    });

    it("Create users A & B", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-authentication",
            "testA-authentication@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-authentication",
            "testB-authentication@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Login user A with username", async () => {
        const result = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testA-authentication",
                password: "passwordA!"
            }
        });

        expect(result.errors === undefined, "no errors").equal(true);
        expect(result.data?.login != null, "should have login key value").equal(true);
    });

    it("Login user A with email", async () => {
        const result = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testA-authentication@test.datapm.io",
                password: "passwordA!"
            }
        });

        expect(result.errors === undefined, "no errors").equal(true);
        expect(result.data?.login != null, "should have login key value").equal(true);
    });

    it("Change User A password", async function () {
        const response = await userAClient.mutate({
            mutation: UpdateMyPasswordDocument,
            variables: {
                value: {
                    oldPassword: "passwordA!",
                    newPassword: "newPasswordA!"
                }
            }
        });

        expect(response.errors === undefined);
    });

    it("Login user A with new password", async () => {
        const result = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testA-authentication",
                password: "newPasswordA!"
            }
        });

        expect(result.errors === undefined, "no errors").equal(true);
        expect(result.data?.login != null, "should have jwt value").equal(true);
    });

    it("Login user A with new old password should fail", async () => {
        const result = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testA-authentication",
                password: "passwordA!"
            }
        });

        expect(
            result.errors?.find((e) => e.message === AUTHENTICATION_ERROR.WRONG_CREDENTIALS) != null,
            "should have invalid login error"
        ).equal(true);
    });

    // TODO Implement and test password reset
    // TODO Implement and test 2FA
});
