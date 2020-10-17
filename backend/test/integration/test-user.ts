import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import {
	LoginDocument,
	MeDocument,
	MyCatalogsDocument,
	MyCatalogsQuery,
	MyCatalogsQueryVariables,
	UserDocument,
	UpdateMeDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

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

	it("Get User A", async function () {
		let response = await userAClient.query({
			query: MeDocument
		});

		let userA = response.data;
		expect(userA.me.firstName).equal("FirstA");
		expect(userA.me.lastName).equal("LastA");
		expect(userA.me.username).to.equal("testA-user");
		expect(userA.me.emailAddress).to.equal("testA-user@test.datapm.io");
		expect(userA.me.nameIsPublic).to.equal(false);
		expect(userA.me.location).equal(null);
		expect(userA.me.twitterHandle).equal(null);
		expect(userA.me.gitHubHandle).equal(null);
		expect(userA.me.website).equal(null);
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

	it("Update User A", async function () {
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

	// TODO Implement twitterHandleIsPublic, gitHubUsername is Public, websiteIsPublic, etc and test
});
