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

    it("Email sent actually contains a token", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });
        const user = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });
        const forgotPasswordToken = user.data!.forgotMyPassword.passwordRecoveryToken;
        await verifyEmailPromise.then((email) => {
            expect(email.html).to.contain(forgotPasswordToken);
            expect(email.text).to.contain(forgotPasswordToken);
        });
        return await verifyEmailPromise;
    });

    it("User password recovery token is valid", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });

        const forgotUser = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });
        await verifyEmailPromise;
        const regex = /[a-zA-z0-9-]/g;
        const forgotPasswordToken = forgotUser.data!.forgotMyPassword.passwordRecoveryToken;
        const passwordRegExTest = regex.test(forgotPasswordToken);
        expect(passwordRegExTest).to.equal(true);
        return await verifyEmailPromise;
    });

    it("Should check if RecoverMyPassword TOKEN is not valid", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });

        const forgotPasswordUser = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });

        const wrongToken = uuid();
        const email = forgotPasswordUser.data?.forgotMyPassword.emailAddress;

        const recoverMyPasswordUser = await userAClient.mutate({
            mutation: RecoverMyPasswordDocument,
            variables: {
                value: {
                    emailAddress: email,
                    token: wrongToken,
                    newPassword: "blackAndWhite!"
                }
            }
        });

        await verifyEmailPromise;
        expect(recoverMyPasswordUser.errors != null).true;
        expect(recoverMyPasswordUser.errors![0].message).to.equal("TOKEN_NOT_VALID");
        return await verifyEmailPromise;
    });

    it("Should use the token captured in the fortPassword integration test to attempt a correct validation", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });
        const forgotPasswordUser = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });
        const email = forgotPasswordUser.data?.forgotMyPassword.emailAddress;
        const token = forgotPasswordUser.data?.forgotMyPassword.passwordRecoveryToken;
        let recoverMyPasswordUser = await userAClient.mutate({
            mutation: RecoverMyPasswordDocument,
            variables: {
                value: {
                    emailAddress: email,
                    token: token,
                    newPassword: "blackAndWhite!"
                }
            }
        });
        await verifyEmailPromise;
        expect(recoverMyPasswordUser.errors == null).true;
        expect(recoverMyPasswordUser.data?.recoverMyPassword.passwordRecoveryToken).to.equal(token);
        return await verifyEmailPromise;
    });

    it("Should validate that the users password has actually changed by using the login(..) mutation", async function () {
        const verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });

        const forgotPasswordUser = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });
        const email = forgotPasswordUser.data?.forgotMyPassword.emailAddress;
        const token = forgotPasswordUser.data?.forgotMyPassword.passwordRecoveryToken;
        const username = forgotPasswordUser.data?.forgotMyPassword.username;
        const changeUserPassword = await userAClient.mutate({
            mutation: RecoverMyPasswordDocument,
            variables: {
                value: {
                    emailAddress: email,
                    token: token,
                    newPassword: "blueAndYellow!"
                }
            }
        });
        let loginWithNewPassword = await userAClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: username,
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
        const forgotPasswordUser = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "forgotpasswordA-user@test.datapm.io"
            }
        });
        const email = forgotPasswordUser.data?.forgotMyPassword.emailAddress;
        const token = forgotPasswordUser.data?.forgotMyPassword.passwordRecoveryToken;
        const username = forgotPasswordUser.data?.forgotMyPassword.username;
        const changeUserPassword = await userAClient.mutate({
            mutation: RecoverMyPasswordDocument,
            variables: {
                value: {
                    emailAddress: email,
                    token: token,
                    newPassword: "blueAndYellow!"
                }
            }
        });
        const loginWithNewPassword = await userAClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: username,
                password: "passwordA2!"
            }
        });
        await verifyEmailPromise;
        expect(loginWithNewPassword.errors != null).true;
        expect(loginWithNewPassword.errors![0].message).equal("WRONG_CREDENTIALS");
        return await verifyEmailPromise;
    });
});
