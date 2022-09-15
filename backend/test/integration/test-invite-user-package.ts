import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    AcceptInviteDocument,
    CreatePackageDocument,
    LoginDocument,
    MeDocument,
    PackageDocument,
    Permission,
    SetPackagePermissionsDocument
} from "./registry-client";
import { MailDevEmail, mailObservable } from "./setup";
import { createAnonymousClient, createTestClient, createUser } from "./test-utils";

describe("Inviting Users", function () {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let invitedUserClient: ApolloClient<NormalizedCacheObject>;
    const anonymousClient = createAnonymousClient();

    let emailVerificationToken: string | undefined;

    before(async function () {
        userAClient = await createUser(
            "FirstA",
            "LastA",
            "testA-invite-users",
            "testA-invite-users@test.datapm.io",
            "passwordA!"
        );
        userBClient = await createUser(
            "FirstB",
            "LastB",
            "testB-invite-users",
            "testB-invite-users@test.datapm.io",
            "passwordB!"
        );
    });

    it("Should create package", async function () {
        const response = await userAClient.mutate({
            mutation: CreatePackageDocument,
            variables: {
                value: {
                    catalogSlug: "testA-invite-users",
                    packageSlug: "legislators-test",
                    displayName: "Congressional LegislatorsB",
                    description: "Test upload of congressional legislatorsB"
                }
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("Should not accept invalid email format", async function () {
        let errorFound = false;
        try {
            await userAClient.mutate({
                mutation: SetPackagePermissionsDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-invite-users",
                        packageSlug: "legislators-test"
                    },
                    value: [
                        {
                            permissions: [Permission.VIEW],
                            usernameOrEmailAddress: "not-valid@email"
                        }
                    ],
                    message: "This is my message. don't wear it out!"
                }
            });
        } catch (error) {
            if (
                error.networkError.result.errors.find(
                    (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                        e.extensions.exception.stacktrace.find((s) => s.includes("INVALID_EMAIL_ADDRESS_FORMAT")) !=
                        null
                ) != null
            )
                errorFound = true;
        }

        expect(errorFound).equal(true);
    });

    it("Should not allow email address in message", async function () {
        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users",
                    packageSlug: "legislators-test"
                },
                value: [
                    {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: "test-invite-package-c@test.datapm.io"
                    }
                ],
                message: "This is test@test.com testing"
            }
        });

        expect(response.errors?.find((e) => e.message.includes("MESSAGE_CANNOT_CONTAIN_EMAIL_ADDRESS"))).not.equal(
            null
        );
    });

    it("Should not allow URL in message", async function () {
        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users",
                    packageSlug: "legislators-test"
                },
                value: [
                    {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: "test-invite-package-c@test.datapm.io"
                    }
                ],
                message: "This is http://datapm.io testing"
            }
        });

        expect(response.errors?.find((e) => e.message.includes("MESSAGE_CANNOT_CONTAIN_URL"))).not.equal(null);
    });

    it("Should not allow HTML tag in message", async function () {
        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users",
                    packageSlug: "legislators-test"
                },
                value: [
                    {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: "test-invite-package-c@test.datapm.io"
                    }
                ],
                message: "This is <script src='test'/>testing"
            }
        });

        expect(response.errors?.find((e) => e.message.includes("MESSAGE_CANNOT_CONTAIN_HTML_TAGS"))).not.equal(null);
    });

    it("Should not allow messages longer than 250 characters", async function () {
        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users",
                    packageSlug: "legislators-test"
                },
                value: [
                    {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: "test-invite-package-c@test.datapm.io"
                    }
                ],
                message: "T".repeat(251)
            }
        });

        expect(response.errors?.find((e) => e.message.includes("MESSAGE_TOO_LONG"))).not.equal(null);
    });

    it("Should send invite email", async function () {
        let userCEmail: MailDevEmail | null = null;
        let userDEmail: MailDevEmail | null = null;
        let userBEmail: MailDevEmail | null = null;
        const verifyEmailPromise = new Promise<void>((resolve, reject) => {
            const subscription = mailObservable.subscribe((email) => {
                if (email.to[0].address === "testB-invite-users@test.datapm.io") userBEmail = email;
                else if (email.to[0].address === "test-invite-package-c@test.datapm.io") userCEmail = email;
                else if (email.to[0].address === "test-invite-package-d@test.datapm.io") userDEmail = email;

                if (userBEmail && userCEmail && userDEmail) {
                    subscription.unsubscribe();
                    resolve();
                }
            });
        });

        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users",
                    packageSlug: "legislators-test"
                },
                value: [
                    {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: "test-invite-package-c@test.datapm.io"
                    },
                    {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: "test-invite-package-d@test.datapm.io"
                    },
                    {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: "testB-invite-users"
                    }
                ],
                message: "Here is my message!@#$%^&*()-=+"
            }
        });

        expect(response.errors == null).equal(true);

        await verifyEmailPromise.then(() => {
            expect(userBEmail?.html).to.not.contain("{{");
            expect(userBEmail?.html).to.contain("Here is my message!@#$%^&*()-=+");
            expect(userBEmail?.html).to.contain("/testA-invite-users/legislators-test");

            expect(userCEmail?.html).to.not.contain("{{");
            emailVerificationToken = (userCEmail?.text as string).match(/\?token=([a-zA-z0-9-]+)/)?.pop();
            expect(emailVerificationToken != null).equal(true);
            expect(userCEmail?.html).to.contain("Here is my message!@#$%^&*()-=+");

            expect(userDEmail?.html).to.not.contain("{{");
            const emailDVerificationToken = (userDEmail?.text as string).match(/\?token=([a-zA-z0-9-]+)/)?.pop();
            expect(emailDVerificationToken != null).equal(true);
            expect(userDEmail?.html).to.contain("Here is my message!@#$%^&*()-=+");
        });
    });

    it("Should not allow inivted user to claim an unavailable username", async function () {
        const response = await anonymousClient.mutate({
            mutation: AcceptInviteDocument,
            variables: {
                password: "password!",
                token: emailVerificationToken,
                username: "testB-invite-users"
            }
        });

        expect(response.errors != null).equal(true);
        expect(response.errors?.find((e) => e.message.includes("USERNAME_NOT_AVAILABLE"))).not.equal(null);
    });

    it("Should not allow invalid token", async function () {
        const response = await anonymousClient.mutate({
            mutation: AcceptInviteDocument,
            variables: {
                password: "password!",
                token: emailVerificationToken + "A",
                username: "new-invited-user-1"
            }
        });

        expect(response.errors != null).equal(true);
        expect(response.errors?.find((e) => e.message.includes("TOKEN_NOT_VALID"))).not.equal(null);
    });

    it("Should allow user to accept invite", async function () {
        const response = await anonymousClient.mutate({
            mutation: AcceptInviteDocument,
            variables: {
                password: "password!",
                token: emailVerificationToken,
                username: "new-invited-user-1"
            }
        });

        expect(response.errors == null).equal(true);
    });

    it("Should allow new user to login", async function () {
        const response = await anonymousClient.mutate({
            mutation: LoginDocument,
            variables: {
                password: "password!",
                username: "new-invited-user-1"
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
        expect(whoAmIResponse.data.me.user.username).equal("new-invited-user-1");
    });

    it("Should return VIEW permission on package", async function () {
        const response = await invitedUserClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users",
                    packageSlug: "legislators-test"
                }
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data.package.myPermissions).includes("VIEW");
    });

    it("Should return VIEW permission on existing user", async function () {
        const response = await userBClient.query({
            query: PackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users",
                    packageSlug: "legislators-test"
                }
            }
        });

        expect(response.errors == null).equal(true);
        expect(response.data.package.myPermissions).includes("VIEW");
    });

    it("Should return TOKEN_NOT_VALID after it has already been used", async function () {
        const response = await anonymousClient.mutate({
            mutation: AcceptInviteDocument,
            variables: {
                password: "password!",
                token: emailVerificationToken,
                username: "new-invited-user-1"
            }
        });

        expect(response.errors?.find((e) => e.message.includes("TOKEN_NOT_VALID"))).not.equal(null);
    });
});
