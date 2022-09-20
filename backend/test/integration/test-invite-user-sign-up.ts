import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    AcceptInviteDocument,
    CreateMeDocument,
    CreatePackageDocument,
    LoginDocument,
    MeDocument,
    PackageDocument,
    Permission,
    SetPackagePermissionsDocument,
    VerifyEmailAddressDocument
} from "./registry-client";
import { MailDevEmail, mailObservable } from "./setup";
import { createAnonymousClient, createTestClient, createUser, createUserDoNotVerifyEmail } from "./test-utils";

/* This file tests the user invite through package sharing, but this invited
user doesn't use the email signup link, and instead registers a new account 
with the same email that they were invited with. 
*/
describe("Invite User That Then Signs Up", function () {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let invitedUserClient: ApolloClient<NormalizedCacheObject>;
    let invitedUserEmailToken: string;
    const anonymousClient = createAnonymousClient();

    let emailVerificationToken: string | undefined;

    before(async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-invite-users-sign-up",
            "testA-invite-users-sign-up@test.datapm.io",
            "passwordA!"
        );
    });

    it("Should create package", async function () {
        const response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-invite-users-sign-up",
                    packageSlug: "legislators-test",
                    displayName: "Congressional LegislatorsB",
                    description: "Test upload of congressional legislatorsB"
                }
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("Should send invite email", async function () {
        let userBEmail: MailDevEmail | null = null;
        const verifyEmailPromise = new Promise<void>((resolve, reject) => {
            const subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === "testb-invite-sign-up@test.datapm.io") userBEmail = email;

                if (userBEmail) {
                    subscription.unsubscribe();
                    resolve();
                }
            });
        });

        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users-sign-up",
                    packageSlug: "legislators-test"
                },
                value: [
                    {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: "testb-invite-sign-up@test.datapm.io"
                    }
                ],
                message: "Here is my message!@#$%^&*()-=+"
            }
        });

        expect(response.errors == null).equal(true);

        await verifyEmailPromise.then(() => {
            expect(userBEmail?.html).to.not.contain("{{");
            emailVerificationToken = (userBEmail?.text as string).match(/\?token=([a-zA-z0-9-]+)/)?.pop();
            expect(emailVerificationToken != null).equal(true);
            expect(userBEmail?.html).to.contain("Here is my message!@#$%^&*()-=+");
        });
    });

    it("Should allow user to signup without using invite link", async function () {
        const response = await createUserDoNotVerifyEmail(
            "SignUpAfterInvite",
            "Collins",
            "test-user-after-signup",
            "testB-invite-sign-up@test.datapm.io",
            "password!"
        );

        expect(response.emailVerificationToken).not.equal(null);

        invitedUserEmailToken = response.emailVerificationToken;
    });

    it("Should not allow new user to login without verifying email address", async function () {
        const response = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                password: "password!",
                username: "testB-invite-sign-up@test.datapm.io"
            }
        });

        expect(response.errors?.find((e) => e.message.includes("EMAIL_ADDRESS_NOT_VERIFIED"))).not.equal(null);
    });

    it("Should allow user to verify email address with token", async function () {
        const response = await anonymousClient.mutate({
            mutation: VerifyEmailAddressDocument,
            variables: {
                token: invitedUserEmailToken
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("Should allow new user to login", async function () {
        const response = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                password: "password!",
                username: "testB-invite-sign-up@test.datapm.io"
            }
        });

        expect(response.errors == null).equal(true);

        invitedUserClient = createTestClient({
            Authorization: "Bearer " + response.data?.login
        });

        const whoAmIResponse = await invitedUserClient.query({
            query: MeDocument
        });

        expect(whoAmIResponse.errors == null).equal(true);
        expect(whoAmIResponse.data.me.user.username).equal("test-user-after-signup");
    });

    it("Should return VIEW permission on package", async function () {
        const response = await invitedUserClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users-sign-up",
                    packageSlug: "legislators-test"
                }
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data.package.myPermissions).includes("VIEW");
    });

    it("Should return TOKEN_NOT_VALID after the user has already signed up", async function () {
        const response = await anonymousClient.mutate({
            mutation: AcceptInviteDocument,
            variables: {
                password: "password!",
                token: emailVerificationToken,
                username: "new-invited-sign-up-user-1"
            }
        });

        expect(response.errors?.find((e) => e.message.includes("TOKEN_NOT_VALID"))).not.equal(null);
    });
});
