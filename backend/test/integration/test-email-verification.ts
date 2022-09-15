import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import { LoginDocument, VerifyEmailAddressDocument } from "./registry-client";
import { createAnonymousClient, createUserDoNotVerifyEmail } from "./test-utils";
import { describe, it } from "mocha";

describe("Email Verification Tests", async () => {
    const anonymousClient: ApolloClient<NormalizedCacheObject> = createAnonymousClient();
    let userAClient: {
        emailVerificationToken: string;
    };
    let userBClient: {
        emailVerificationToken: string;
    };

    before(async () => {
        expect(anonymousClient).to.not.equal(undefined);
    });

    it("Invalid email verification token", async function () {
        const response = await anonymousClient.mutate({
            mutation: VerifyEmailAddressDocument,
            variables: {
                token: "made-up-not-valid"
            }
        });

        if (response.errors == null) throw new Error("Expected error response");

        expect(response.errors[0].message).to.equal("TOKEN_NOT_VALID");
    });

    it("Create users A & B", async function () {
        userAClient = await createUserDoNotVerifyEmail(
            "FirstA",
            "LastA",
            "testA-emailVerification",
            "testA-emailVerification@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUserDoNotVerifyEmail(
            "FirstB",
            "LastB",
            "testB-emailVerification",
            "testB-emailVerification@test.datapm.io",
            "passwordB!"
        );
        expect(userAClient).to.not.equal(undefined);
        expect(userBClient).to.not.equal(undefined);
    });

    it("Login without validating email", async function () {
        const response = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "testA-emailVerification@test.datapm.io",
                password: "passwordA!"
            }
        });

        if (response.errors == null) throw new Error("Expected error response");

        expect(response.errors != null).equal(true);
        expect(response.errors[0].message).equal("EMAIL_ADDRESS_NOT_VERIFIED");
    });

    it("Validate correct token", async function () {
        const response = await anonymousClient.mutate({
            mutation: VerifyEmailAddressDocument,
            variables: {
                token: userAClient.emailVerificationToken
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("Validate correct token again", async function () {
        const response = await anonymousClient.mutate({
            mutation: VerifyEmailAddressDocument,
            variables: {
                token: userAClient.emailVerificationToken
            }
        });

        expect(response.errors == null).equal(true);
    });
});
