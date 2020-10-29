import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { Buffer } from "buffer";
import { expect } from "chai";
import { CreateAPIKeyDocument, DeleteAPIKeyDocument, MeDocument, Scope } from "./registry-client";
import { mailObservable } from "./setup";
import { createAnonymousClient, createTestClient, createUser } from "./test-utils";
import { EMAIL_SUBJECTS } from "../../src/util/smtpUtil";
import { describe, it } from "mocha";

describe("API Key Tests", async () => {
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;
    let anonymousUser = createAnonymousClient();
    let apiKeyClient: ApolloClient<NormalizedCacheObject>;

    let apiKeyid: string;

    before(async () => {});

    it("Create users A & B", async function () {
        userAClient = await createUser("FirstA", "LastA", "testA-apiKey", "testA-apiKey@test.datapm.io", "passwordA!");
        userBClient = await createUser("FirstB", "LastB", "testB-apiKey", "testB-apiKey@test.datapm.io", "passwordB!");
        expect(userAClient).to.exist;
        expect(userBClient).to.exist;
    });

    it("Anonymous user should not be able to create an API Key", async function () {
        let response = await anonymousUser.mutate({
            mutation: CreateAPIKeyDocument,
            variables: {
                value: {
                    label: "test",
                    scopes: [Scope.MANAGE_API_KEYS, Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
                }
            }
        });

        expect(response.errors != null, "has errors").true;
        expect(response.errors![0].message).equal("NOT_AUTHENTICATED");
    });

    it("User A create API Key - require all scopes", async function () {
        let response = await userAClient.mutate({
            mutation: CreateAPIKeyDocument,
            variables: {
                value: {
                    label: "test",
                    scopes: [Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
                }
            }
        });

        expect(response.errors != null, "has errors").true;
        expect(response.errors![0].message).equal("ALL_SCOPES_REQUIRED");
    });

    it("User A create API Key", async function () {
        let returnPromise = new Promise<any>((r) => {
            let subscription = mailObservable.subscribe((email) => {
                subscription.unsubscribe();

                expect(email.html, "no tokens").not.to.contain("{{");
                expect(email.text, "no tokens").not.to.contain("{{");
                expect(email.subject, "email subject").to.equal(EMAIL_SUBJECTS.NEW_API_KEY);
                expect(email.to[0].address).to.equal("testA-apiKey@test.datapm.io");
                expect(email.to[0].name).to.equal("FirstA LastA");

                r(email);
            });
        });
        let response = await userAClient.mutate({
            mutation: CreateAPIKeyDocument,
            variables: {
                value: {
                    label: "test",
                    scopes: [Scope.MANAGE_API_KEYS, Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
                }
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.createAPIKey.id != null).true;
        expect(response.data!.createAPIKey.label).equal("test");
        expect(response.data!.createAPIKey.scopes.indexOf(Scope.MANAGE_API_KEYS) != -1).true;
        expect(response.data!.createAPIKey.scopes.indexOf(Scope.READ_PRIVATE_ASSETS) != -1).true;
        expect(response.data!.createAPIKey.scopes.indexOf(Scope.MANAGE_PRIVATE_ASSETS) != -1).true;
        expect(response.data!.createAPIKey.secret != null).true;

        apiKeyid = response.data!.createAPIKey.id;

        let key = Buffer.from(response.data!.createAPIKey.id + "." + response.data!.createAPIKey.secret).toString(
            "base64"
        );

        apiKeyClient = createTestClient({
            "X-API-KEY": key
        });

        return returnPromise;
    });

    it("User A create API Key - conflicting label", async function () {
        let response = await userAClient.mutate({
            mutation: CreateAPIKeyDocument,
            variables: {
                value: {
                    label: "test",
                    scopes: [Scope.MANAGE_API_KEYS, Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
                }
            }
        });

        expect(response.errors != null, "has errors").true;
        expect(response.errors![0].message).equal("APIKEY_LABEL_NOT_AVIALABLE");
    });

    it("User A use API key to get self information", async function () {
        let response = await apiKeyClient.query({
            query: MeDocument
        });

        expect(response.errors == null).true;
        expect(response.data!.me.username).equal("testA-apiKey");
    });

    it("Delete API key", async function () {
        let response = await apiKeyClient.mutate({
            mutation: DeleteAPIKeyDocument,
            variables: {
                id: apiKeyid
            }
        });

        expect(response.errors == null, "no errors").true;
        expect(response.data!.deleteAPIKey.id).equal(apiKeyid);
        expect(response.data!.deleteAPIKey.label).equal("test");
        expect(response.data!.deleteAPIKey.scopes.indexOf(Scope.MANAGE_API_KEYS) != -1).true;
        expect(response.data!.deleteAPIKey.scopes.indexOf(Scope.READ_PRIVATE_ASSETS) != -1).true;
        expect(response.data!.deleteAPIKey.scopes.indexOf(Scope.MANAGE_PRIVATE_ASSETS) != -1).true;
    });

    it("User A use API key to get self information - should not work", async function () {
        let errorFound = false;

        await apiKeyClient
            .query({
                query: MeDocument
            })
            .catch((error: ErrorResponse) => {
                let fetchResult = error.networkError as ServerError;
                if (
                    fetchResult.result.errors.find(
                        (e: { extensions: { exception: { stacktrace: string[] } } }) =>
                            e.extensions.exception.stacktrace.find(
                                (s) => s == "AuthenticationError: Context creation failed: API_KEY_NOT_FOUND"
                            ) != null
                    ) != null
                )
                    errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "find error").equal(true);
            });
    });
});
