import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { ForgotMyPasswordDocument, RecoverMyPasswordDocument, LoginDocument } from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";
import { mailObservable } from "./setup";
import { v4 as uuid } from "uuid";

describe("Forgot Password Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create forgot password user A", async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "forgotpassword-user",
            "forgotpasswordA-user@test.datapm.io",
            "passwordA2!"
        );
        expect(userAClient).to.exist;
    });

    it("User account doesn't exist, but returns successfully", async function () {
        let user = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "does-not-exist-user@test.datapm.io"
            }
        });
        expect(user.data!.forgotMyPassword).equal(null);
    });

    it("SMTP fails to send", async function () {});

    it("Email sent contains no {{ (left over tokens not replaced)", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });
        await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });
        await verifyEmailPromise.then((email) => {
            expect(email.html).to.not.contain("{{registry_name}}");
            expect(email.html).to.not.contain("{{registry_url}}");
            expect(email.html).to.not.contain("{{token}}");
            expect(email.html).to.not.contain("{{");
            expect(email.text).to.not.contain("{{registry_name}}");
            expect(email.text).to.not.contain("{{registry_url}}");
            expect(email.text).to.not.contain("{{token}}");
            expect(email.text).to.not.contain("{{");
        });
        return await verifyEmailPromise;
    });

    it("Email sent actually contains a token and recovery token is valid", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });
        await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });

        await verifyEmailPromise.then((email) => {
            let token;
            const regex = /[a-zA-z0-9-]/g;
            const emailForgotToken = (email.text as String).match(/\?token=([a-zA-z0-9-]+)/);
            if (emailForgotToken) token = regex.test(emailForgotToken[1]);
            expect(emailForgotToken != null).true;
            expect(token).to.equal(true);
        });
        return await verifyEmailPromise;
    });

    it("Should check if RecoverMyPassword TOKEN is not valid", async function () {
        const recoverMyPasswordUser = await userAClient.mutate({
            mutation: RecoverMyPasswordDocument,
            variables: {
                value: {
                    token: "definitely_the_wrong-to%@n",
                    newPassword: "blackAndWhite!"
                }
            }
        });
        expect(recoverMyPasswordUser.errors! != null).true;
        expect(recoverMyPasswordUser.errors![0].message).to.equal("TOKEN_NOT_VALID");
    });

    it("Should use the token captured in the fortPassword integration test to attempt a correct validation", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });
        await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });

        const token = await verifyEmailPromise.then((email) => {
            let token;
            const emailForgotToken = (email.text as String).match(/\?token=([a-zA-z0-9-]+)/);
            if (emailForgotToken) token = emailForgotToken[1];
            return token;
        });

        const correctRecoveryToken = await userAClient.mutate({
            mutation: RecoverMyPasswordDocument,
            variables: {
                value: {
                    token: token,
                    newPassword: "blackAndWhite!"
                }
            }
        });
        expect(correctRecoveryToken.errors! == null).true;
        return await verifyEmailPromise;
    });

    it("Should validate that the users password has actually changed by using the login(..) mutation", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });
        await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });
        const token = await verifyEmailPromise.then((email) => {
            let token;
            const emailForgotToken = (email.text as String).match(/\?token=([a-zA-z0-9-]+)/);
            if (emailForgotToken) token = emailForgotToken[1];
            return token;
        });

        await userAClient.mutate({
            mutation: RecoverMyPasswordDocument,
            variables: {
                value: {
                    token: token,
                    newPassword: "blueAndYellow!"
                }
            }
        });

        let loginWithNewPassword = await userAClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "forgotpassword-user",
                password: "blueAndYellow!"
            }
        });
        await verifyEmailPromise;
        expect(loginWithNewPassword.errors == null).true;
        expect(loginWithNewPassword.data?.login).to.exist;
        return await verifyEmailPromise;
    });

    it("Should validate that the old password does not work after change", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });
        await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });
        const token = await verifyEmailPromise.then((email) => {
            let token;
            const emailForgotToken = (email.text as String).match(/\?token=([a-zA-z0-9-]+)/);
            if (emailForgotToken) token = emailForgotToken[1];
            return token;
        });

        await userAClient.mutate({
            mutation: RecoverMyPasswordDocument,
            variables: {
                value: {
                    token: token,
                    newPassword: "blueAndYellow!"
                }
            }
        });

        const loginWithNewPassword = await userAClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: "forgotpassword-user",
                password: "passwordA2!"
            }
        });
        await verifyEmailPromise;
        expect(loginWithNewPassword.errors != null).true;
        expect(loginWithNewPassword.errors![0].message).equal("WRONG_CREDENTIALS");
        return await verifyEmailPromise;
    });
});
