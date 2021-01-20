import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import {
    AcceptInviteDocument,
    CreatePackageDocument,
    LoginDocument,
    PackageDocument,
    Permission,
    SetPackagePermissionsDocument
} from "./registry-client";
import { mailObservable } from "./setup";
import { createAnonymousClient, createTestClient, createUser } from "./test-utils";

describe("Inviting USers", function () {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let invitedUserClient: ApolloClient<NormalizedCacheObject>;
    let anonymousClient = createAnonymousClient();

    let emailVerificationToken: string = "";

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

    it("Should not accept invalid invite", async function () {
        let errorFound = false;
        try {
            await userAClient.mutate({
                mutation: SetPackagePermissionsDocument,
                variables: {
                    identifier: {
                        catalogSlug: "testA-invite-users",
                        packageSlug: "legislators-test"
                    },
                    value: {
                        permissions: [Permission.VIEW],
                        usernameOrEmailAddress: "not-valid@email"
                    }
                }
            });
        } catch (error) {
            console.log(JSON.stringify(error, null, 1));

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

    it("Should send invite email", async function () {
        let verifyEmailPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();
                r(email);
            });
        });

        const response = await userAClient.mutate({
            mutation: SetPackagePermissionsDocument,
            variables: {
                identifier: {
                    catalogSlug: "testA-invite-users",
                    packageSlug: "legislators-test"
                },
                value: {
                    permissions: [Permission.VIEW],
                    usernameOrEmailAddress: "test-invite-package-c@test.datapm.io"
                }
            }
        });

        expect(response.errors == null).equal(true);

        verifyEmailPromise.then((email) => {
            expect(email.html).to.not.contain("{{");
            emailVerificationToken = (email.text as String).match(/\?token=([a-zA-z0-9-]+)/)!.pop()!;
            expect(emailVerificationToken != null).equal(true);
        });
    });

    it("Should not allow unavailable username", async function () {
        const response = await anonymousClient.mutate({
            mutation: AcceptInviteDocument,
            variables: {
                password: "password!",
                token: emailVerificationToken,
                username: "testB-invite-users"
            }
        });

        expect(response.errors != null).equal(true);
        expect(response.errors!.find((e) => e.message.includes("USERNAME_NOT_AVAILABLE"))).not.equal(null);
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
        expect(response.errors!.find((e) => e.message.includes("TOKEN_NOT_VALID"))).not.equal(null);
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
            Authorization: "Bearer " + response.data!.login
        });
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
    });
});
