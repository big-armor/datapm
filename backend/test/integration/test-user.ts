import { ApolloClient, FetchResult, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { expect } from "chai";
import { MeDocument, UserDocument, UpdateMeDocument, LoginMutation } from "./registry-client";
import { createUser } from "./test-utils";
import { describe, it } from "mocha";

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

    it("Create an email that already exists", async function () {
        let errorFound = false;
        await createUser("FirstA", "LastA", "testA-user", "testA-user@test.datapm.io", "passwordA!")
            .catch((response: FetchResult<LoginMutation, Record<string, any>, Record<string, any>>) => {
                if (response.errors!.find((e) => e.message == "EMAIL_ADDRESS_NOT_AVAILABLE") != null) errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "email address not available error").equal(true);
            });
    });

    it("Create a username that already exists", async function () {
        let errorFound = false;
        await createUser("FirstA", "LastA", "testA-user", "testA-user2@test.datapm.io", "passwordA!")
            .catch((response: FetchResult<LoginMutation, Record<string, any>, Record<string, any>>) => {
                if (response.errors!.find((e) => e.message == "USERNAME_NOT_AVAILABLE") != null) errorFound = true;
            })
            .then((client) => {
                expect(errorFound, "username not available error").equal(true);
            });
    });

    it("Get User A", async function () {
        let response = await userAClient.query({
            query: MeDocument
        });

        let userA = response.data;
        expect(userA.me.firstName).equal("FirstA");
        expect(userA.me.lastName).equal("LastA");
        expect(userA.me.username).to.equal("testA-user");
        expect(userA.me.emailAddress).to.equal("testA-user@test.datapm.io");
        expect(userA.me.nameIsPublic, "nameIsPUblic should be false").to.equal(false);
        expect(userA.me.location, "location should be null").equal(null);
        expect(userA.me.twitterHandle, "twitterHandle should be null").equal(null);
        expect(userA.me.gitHubHandle, "gitHubHandle should be null").equal(null);
        expect(userA.me.website, "website should be null").equal(null);
    });

    it("Get User B", async function () {
        let response = await userBClient.query({
            query: MeDocument
        });

        let userB = response.data;
        expect(userB.me.firstName).equal("FirstB");
        expect(userB.me.lastName).equal("LastB");
        expect(userB.me.username).to.equal("testB-user");
        expect(userB.me.emailAddress).to.equal("testB-user@test.datapm.io");
        expect(userB.me.nameIsPublic).to.equal(false);
        expect(userB.me.location).equal(null);
        expect(userB.me.twitterHandle).equal(null);
        expect(userB.me.gitHubHandle).equal(null);
        expect(userB.me.website).equal(null);
    });

    it("User B Get User A", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.firstName).equal(null);
        expect(userA.user.lastName).equal(null);
        expect(userA.user.username).to.equal("testA-user");
        expect(userA.user.emailAddress).to.equal(null);
        expect(userA.user.nameIsPublic).to.equal(false);
        expect(userA.user.location).equal(null);
        expect(userA.user.twitterHandle).equal(null);
        expect(userA.user.gitHubHandle).equal(null);
        expect(userA.user.website).equal(null);
    });

    it("Set User A Name Is Public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    nameIsPublic: true
                }
            }
        });

        expect(response.data!.updateMe.nameIsPublic).to.equal(true);
    });

    it("User B Get User A Public Name", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.nameIsPublic).to.equal(true);
        expect(userA.user.firstName).equal("FirstA");
        expect(userA.user.lastName).equal("LastA");
    });

    it("Set User A twitterHandle", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    twitterHandle: "testTwitterA"
                }
            }
        });

        expect(response.data!.updateMe.twitterHandle).to.equal("testTwitterA");
    });

    it("User B Access User A Twitter Handle - Not Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.twitterHandleIsPublic).to.equal(false);
        expect(userA.user.twitterHandle).equal(null);
    });

    it("Set User A set twitter handle public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    twitterHandleIsPublic: true
                }
            }
        });

        expect(response.data!.updateMe.twitterHandle).to.equal("testTwitterA");
        expect(response.data!.updateMe.twitterHandleIsPublic).to.equal(true);
    });

    it("User B Access User A Twitter Handle - Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.twitterHandleIsPublic).to.equal(true);
        expect(userA.user.twitterHandle).equal("testTwitterA");
    });

    it("Set User A set twitter handle public not public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    twitterHandleIsPublic: false
                }
            }
        });

        expect(response.data!.updateMe.twitterHandle).to.equal("testTwitterA");
        expect(response.data!.updateMe.twitterHandleIsPublic).to.equal(false);
    });

    it("User B Access User A Twitter Handle - Not Public again", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.twitterHandleIsPublic).to.equal(false);
        expect(userA.user.twitterHandle).equal(null);
    });

    it("Set User A gitHubHandle", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    gitHubHandle: "testGithubA"
                }
            }
        });

        expect(response.data!.updateMe.gitHubHandle).to.equal("testGithubA");
    });

    it("User B Access User A Github Handle - Not Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.gitHubHandleIsPublic).to.equal(false);
        expect(userA.user.gitHubHandle).equal(null);
    });

    it("Set User A set github handle public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    gitHubHandleIsPublic: true
                }
            }
        });

        expect(response.data!.updateMe.gitHubHandle).to.equal("testGithubA");
        expect(response.data!.updateMe.gitHubHandleIsPublic).to.equal(true);
    });

    it("User B Access User A Github Handle - Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.gitHubHandleIsPublic).to.equal(true);
        expect(userA.user.gitHubHandle).equal("testGithubA");
    });

    it("Set User A set github handle public not public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    gitHubHandleIsPublic: false
                }
            }
        });

        expect(response.data!.updateMe.gitHubHandle).to.equal("testGithubA");
        expect(response.data!.updateMe.gitHubHandleIsPublic).to.equal(false);
    });

    it("User B Access User A Github Handle - Not Public again", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.gitHubHandleIsPublic).to.equal(false);
        expect(userA.user.gitHubHandle).equal(null);
    });

    it("Set User A location", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    location: "testLocationA"
                }
            }
        });

        expect(response.data!.updateMe.location).to.equal("testLocationA");
    });

    it("User B Access User A Location - Not Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.locationIsPublic).to.equal(false);
        expect(userA.user.location).equal(null);
    });

    it("Set User A set location public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    locationIsPublic: true
                }
            }
        });

        expect(response.data!.updateMe.location).to.equal("testLocationA");
        expect(response.data!.updateMe.locationIsPublic).to.equal(true);
    });

    it("User B Access User A Location - Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.locationIsPublic).to.equal(true);
        expect(userA.user.location).equal("testLocationA");
    });

    it("Set User A set location public not public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    locationIsPublic: false
                }
            }
        });

        expect(response.data!.updateMe.location).to.equal("testLocationA");
        expect(response.data!.updateMe.locationIsPublic).to.equal(false);
    });

    it("User B Access User A Location - Not Public again", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.locationIsPublic).to.equal(false);
        expect(userA.user.location).equal(null);
    });

    it("Set User A website", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    website: "testWebsiteA"
                }
            }
        });

        expect(response.data!.updateMe.website).to.equal("testWebsiteA");
    });

    it("User B Access User A Website - Not Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.websiteIsPublic).to.equal(false);
        expect(userA.user.website).equal(null);
    });

    it("Set User A set website public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    websiteIsPublic: true
                }
            }
        });

        expect(response.data!.updateMe.website).to.equal("testWebsiteA");
        expect(response.data!.updateMe.websiteIsPublic).to.equal(true);
    });

    it("User B Access User A Website - Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.websiteIsPublic).to.equal(true);
        expect(userA.user.website).equal("testWebsiteA");
    });

    it("Set User A set website public not public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    websiteIsPublic: false
                }
            }
        });

        expect(response.data!.updateMe.website).to.equal("testWebsiteA");
        expect(response.data!.updateMe.websiteIsPublic).to.equal(false);
    });

    it("User B Access User A Website - Not Public again", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.websiteIsPublic).to.equal(false);
        expect(userA.user.website).equal(null);
    });

    it("Set User A emailAddress", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    emailAddress: "testEmailAddressA@a.com"
                }
            }
        });

        expect(response.data!.updateMe.emailAddress).to.equal("testEmailAddressA@a.com");
    });

    it("User B Access User A emailAddress - Not Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.emailAddressIsPublic).to.equal(false);
        expect(userA.user.emailAddress).equal(null);
    });

    it("Set User A set emailAddress public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    emailAddressIsPublic: true
                }
            }
        });

        expect(response.data!.updateMe.emailAddress).to.equal("testEmailAddressA@a.com");
        expect(response.data!.updateMe.emailAddressIsPublic).to.equal(true);
    });

    it("User B Access User A emailAddress - Public", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.emailAddressIsPublic).to.equal(true);
        expect(userA.user.emailAddress).equal("testEmailAddressA@a.com");
    });

    it("Set User A set emailAddress public not public", async function () {
        let response = await userAClient.mutate({
            mutation: UpdateMeDocument,
            variables: {
                value: {
                    emailAddressIsPublic: false
                }
            }
        });

        expect(response.data!.updateMe.emailAddress).to.equal("testEmailAddressA@a.com");
        expect(response.data!.updateMe.emailAddressIsPublic).to.equal(false);
    });

    it("User B Access User A emailAddress - Not Public again", async function () {
        let response = await userBClient.query({
            query: UserDocument,
            variables: {
                username: "testA-user"
            }
        });

        let userA = response.data;
        expect(userA.user.emailAddressIsPublic).to.equal(false);
        expect(userA.user.emailAddress).equal(null);
    });

    // TODO test login
    // TODO delete user and test
});
