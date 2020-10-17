import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import { LoginDocument, MyCatalogsDocument, MyCatalogsQuery, MyCatalogsQueryVariables } from "./registry-client";
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
		await createUser("Password", "TooShort", "willFail", "fail@fail.com", "abc")
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
				expect(errorFound, "Password was too long error not found").equal(true);
			});
	});

	it("Create users A & B", async function () {
		userAClient = await createUser("FirstA", "LastA", "testA", "testA@test.datapm.io", "passwordA!");
		userBClient = await createUser("FirstB", "LastB", "testB", "testB@test.datapm.io", "passwordB!");
		expect(userAClient).to.exist;
		expect(userBClient).to.exist;
	});

	it("Get Users A & B", async function () {});

	it("Get catalogs for user A & B", async function () {
		return userAClient
			.query<MyCatalogsQuery, MyCatalogsQueryVariables>({
				query: MyCatalogsDocument
			})
			.catch((error) => {
				console.error(error);
				expect(true, "getting user catalogs failed").equal(false);
			})
			.then((value) => {
				expect(value).to.exist;

				if (value) {
					let catalogs = value!.data.myCatalogs;

					expect(catalogs.length).equal(1);

					expect(catalogs[0]!.identifier.catalogSlug == "testA");
					expect(catalogs[0]!.isPublic).equal(false);
				} else {
					expect(true, "value to exist").equal(false);
				}
			});
	});
});
