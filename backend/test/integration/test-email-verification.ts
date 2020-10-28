import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import { VerifyEmailAddressDocument } from "./registry-client";
import { createAnonymousClient, createUserDoNotVerifyEmail } from "./test-utils";

describe("Email Verification Tests", async () => {
    let anonymousClient: ApolloClient<NormalizedCacheObject> = createAnonymousClient();
    let userAClient: {
        emailVerificationToken: string;
        client: ApolloClient<NormalizedCacheObject>;
    };
    let userBClient: {
        emailVerificationToken: string;
        client: ApolloClient<NormalizedCacheObject>;
    };

    before(async () => {
        expect(anonymousClient).to.exist;
    });

    it("Invalid email verification token", async function () {
        let response = await anonymousClient.mutate({
            mutation: VerifyEmailAddressDocument,
            variables: {
                token: "made-up-not-valid"
            }
        });

        expect(response.errors != null).true;
        expect(response.errors![0].message).to.equal("TOKEN_NOT_VALID");
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
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Validate wrong users email token", async function () {
        let response = await userAClient.client.mutate({
            mutation: VerifyEmailAddressDocument,
            variables: {
                token: userBClient.emailVerificationToken
            }
        });

        expect(response.errors != null).true;
        expect(response.errors![0].message).equal("TOKEN_DOES_NOT_MATCH");
    });

    it("Validate correct token", async function () {
        let response = await userAClient.client.mutate({
            mutation: VerifyEmailAddressDocument,
            variables: {
                token: userAClient.emailVerificationToken
            }
        });

        expect(response.errors == null).true;
    });

    it("Validate correct token again", async function () {
        let response = await userAClient.client.mutate({
            mutation: VerifyEmailAddressDocument,
            variables: {
                token: userAClient.emailVerificationToken
            }
        });

        expect(response.errors == null).true;
    });
});
