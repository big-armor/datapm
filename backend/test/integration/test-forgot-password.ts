import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { ForgotMyPasswordDocument, RecoverMyPasswordDocument, LoginDocument } from "./registry-client";
import { createUser, createAnonymousClient } from "./test-utils";
import { describe, it } from "mocha";
import { mailObservable } from "./setup";
import { v4 as uuid } from "uuid";

describe("User Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {});

    it("Create users A & B", async function () {
        userAClient = await createUser("FirstA", "LastA", "testA-user", "testA-user@test.datapm.io", "passwordA!");
        userBClient = await createUser("FirstB", "LastB", "testB-user", "testB-user@test.datapm.io", "passwordB!");
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
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

    it("SMTP fails to send", async function () {
        // process.env["SMTP_SERVER"] == null;
        // process.env["SMTP_PORT"] == null;
        // let verifyEmailPromise = new Promise<any>((r) => {
        //     let subscription = mailObservable.subscribe((email) => {
        //         subscription.unsubscribe();
        //         r(email);
        //     });
        // });
        // verifyEmailPromise.then((email) => {
        //     console.log(email);
        // });
        // let response = await userAClient.mutate({
        //     mutation: ForgotMyPasswordDocument,
        //     variables: {
        //         emailAddress: "testA-user@test.datapm.io"
        //     }
        // });
        // console.log("SMTP FAILS TO SEND:", response);
    });

    it("Email sent contains no {{ (left over tokens not replaced)", async function () {
        let verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });

        return new Promise(async (resolve, reject) => {
            await userAClient
                .mutate({
                    mutation: ForgotMyPasswordDocument,
                    variables: {
                        emailAddress: "testA-user@test.datapm.io"
                    }
                })
                .then((user) => {
                    verifyEmailPromise.then((email) => {
                        try {
                            expect(email.html).to.not.contain("{{registry_name}}");
                            expect(email.html).to.not.contain("{{registry_url}}");
                            expect(email.html).to.not.contain("{{token}}");
                            expect(email.html).to.not.contain("{{");
                            expect(email.text).to.not.contain("{{registry_name}}");
                            expect(email.text).to.not.contain("{{registry_url}}");
                            expect(email.text).to.not.contain("{{token}}");
                            expect(email.text).to.not.contain("{{");
                            resolve();
                        } catch (e) {
                            console.log("Error: ", e);
                            reject();
                        }
                    });
                });
        });
    });

    it("Email sent actually contains a token", async function () {
        let verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });

        return new Promise(async (resolve, reject) => {
            await userAClient
                .mutate({
                    mutation: ForgotMyPasswordDocument,
                    variables: {
                        emailAddress: "testA-user@test.datapm.io"
                    }
                })
                .then((user) => {
                    const forgotPasswordToken = user.data!.forgotMyPassword.passwordRecoveryToken;
                    verifyEmailPromise.then((email) => {
                        try {
                            expect(email.html).to.contain(forgotPasswordToken);
                            expect(email.text).to.contain(forgotPasswordToken);
                            resolve();
                        } catch (e) {
                            console.log("Error: ", e);
                            reject();
                        }
                    });
                });
        });
    });

    it("User password recovery token is valid", async function () {
        let user = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "testA-user@test.datapm.io"
            }
        });
        const forgotPasswordToken = user.data!.forgotMyPassword.passwordRecoveryToken;
        const regex = /[a-zA-z0-9-]/g;
        const passwordRegExTest = regex.test(forgotPasswordToken);
        expect(passwordRegExTest).to.equal(true);
    });

    it("Should check if RecoverMyPassword TOKEN is not valid", async function () {
        let forgotPasswordUser = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "testA-user@test.datapm.io"
            }
        });

        const wrongToken = uuid();
        const email = forgotPasswordUser.data?.forgotMyPassword.emailAddress;

        let recoverMyPasswordUser = await userAClient.mutate({
            mutation: RecoverMyPasswordDocument,
            variables: {
                value: {
                    emailAddress: email,
                    token: wrongToken,
                    newPassword: "blackAndWhite!"
                }
            }
        });

        expect(recoverMyPasswordUser.errors != null).true;
        expect(recoverMyPasswordUser.errors![0].message).to.equal("TOKEN_NOT_VALID");
    });

    it("Should use the token captured in the fortPassword integration test to attempt a correct validation", async function () {
        let forgotPasswordUser = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "testA-user@test.datapm.io"
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

        expect(recoverMyPasswordUser.errors == null).true;
        expect(recoverMyPasswordUser.data?.recoverMyPassword.passwordRecoveryToken).to.equal(token);
    });

    it("Should validate that the users password has actually changed by using the login(..) mutation", async function () {
        let forgotPasswordUser = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "testA-user@test.datapm.io"
            }
        });

        const email = forgotPasswordUser.data?.forgotMyPassword.emailAddress;
        const token = forgotPasswordUser.data?.forgotMyPassword.passwordRecoveryToken;
        const username = forgotPasswordUser.data?.forgotMyPassword.username;

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

        let loginWithNewPassword = await userAClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: username,
                password: "blackAndWhite!"
            }
        });

        expect(loginWithNewPassword.errors == null).true;
        expect(loginWithNewPassword.data?.login).to.exist;
    });

    it("Should validate that the old password does not work after change", async function () {
        let forgotPasswordUser = await userAClient.mutate({
            mutation: ForgotMyPasswordDocument,
            variables: {
                emailAddress: "testA-user@test.datapm.io"
            }
        });

        const email = forgotPasswordUser.data?.forgotMyPassword.emailAddress;
        const token = forgotPasswordUser.data?.forgotMyPassword.passwordRecoveryToken;
        const username = forgotPasswordUser.data?.forgotMyPassword.username;

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

        let loginWithNewPassword = await userAClient.mutate({
            mutation: LoginDocument,
            variables: {
                username: username,
                password: "passwordA!"
            }
        });

        expect(loginWithNewPassword.errors != null).true;
        expect(loginWithNewPassword.errors![0].message).equal("WRONG_CREDENTIALS");
    });
});
