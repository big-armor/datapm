import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import {
	LoginDocument,
	MeDocument,
	MyCatalogsDocument,
	MyCatalogsQuery,
	MyCatalogsQueryVariables,
	UserDocument
} from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

describe("Authentication Tests", async () => {
	let anonymousClient: ApolloClient<NormalizedCacheObject> = createAnonymousClient();
	let userAClient: ApolloClient<NormalizedCacheObject>;
	let userBClient: ApolloClient<NormalizedCacheObject>;

	before(async () => {
		expect(anonymousClient).to.exist;
	});

	it("Login for incorrect user should fail", async () => {
		let result = await anonymousClient.mutate({
			mutation: LoginDocument,
			variables: {
				username: "test",
				password: "test1234!"
			}
		});

		expect(result.errors!.length > 0, "should have errors").equal(true);
		expect(
			result.errors!.find((e) => e.message == "USER_NOT_FOUND") != null,
			"should have invalid login error"
		).equal(true);
	});

	it("Password too short test", async function () {
		let errorFound = false;
		await createUser("Password", "TooShort", "willFail", "fail@fail.com", "abcdefg")
			.catch((error: ErrorResponse) => {
				let fetchResult = error.networkError as ServerError;
				if (
					fetchResult.result.errors.find(
						(e: { extensions: { exception: { stacktrace: string[] } } }) =>
							e.extensions.exception.stacktrace.find((s) => s == "ValidationError: PASSWORD_TOO_SHORT") !=
							null
					) != null
				)
					errorFound = true;
			})
			.then((client) => {
				expect(errorFound, "Password was too short error not found").equal(true);
			});
	});

	it("Password too long test", async function () {
		let errorFound = false;
		await createUser(
			"Password",
			"TooLong",
			"willFail",
			"fail@fail.com",
			"abcasdfasdfasdfasdfadsfasdfasdfasdfasdfwadsfasdfasdfasdfasdfasdfasdfadsfasdfasdfasdfasdfasdfasdfasdfasdfasdfasdf"
		)
			.catch((error) => {
				let fetchResult = error.networkError as ServerError;
				if (
					fetchResult.result.errors.find(
						(e: { extensions: { exception: { stacktrace: string[] } } }) =>
							e.extensions.exception.stacktrace.find((s) => s == "ValidationError: PASSWORD_TOO_LONG") !=
							null
					) != null
				)
					errorFound = true;
			})
			.then((client) => {
				expect(errorFound, "PASSWORD_TOO_LONG error not returned").equal(true);
			});
	});

	it("Create users A & B", async function () {
		userAClient = await createUser(
			"FirstA",
			"LastA",
			"testA-authentication",
			"testA-authentication@test.datapm.io",
			"passwordA!"
		);
		userBClient = await createUser(
			"FirstB",
			"LastB",
			"testB-authentication",
			"testB-authentication@test.datapm.io",
			"passwordB!"
		);
		expect(userAClient).to.exist;
		expect(userBClient).to.exist;
	});

	// TODO Test user login failures
	// TODO Implement and test password reset
	// TODO Implement and test 2FA
});
