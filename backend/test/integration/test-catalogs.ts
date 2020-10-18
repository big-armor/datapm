import { ApolloClient, NormalizedCacheObject, ServerError } from "@apollo/client/core";
import { ErrorResponse } from "apollo-link-error";
import { expect } from "chai";
import { LoginDocument, MyCatalogsDocument, MyCatalogsQuery, MyCatalogsQueryVariables } from "./registry-client";
import { createAnonymousClient, createUser } from "./test-utils";

describe("Catalog Tests", async () => {
	let userAClient: ApolloClient<NormalizedCacheObject>;
	let userBClient: ApolloClient<NormalizedCacheObject>;

	before(async () => {});

	it("Create users A & B", async function () {
		userAClient = await createUser(
			"FirstA",
			"LastA",
			"testA-catalog",
			"testA-catalog@test.datapm.io",
			"passwordA!"
		);
		userBClient = await createUser(
			"FirstB",
			"LastB",
			"testB-catalog",
			"testB-catalog@test.datapm.io",
			"passwordB!"
		);
		expect(userAClient).to.exist;
		expect(userBClient).to.exist;
	});

	it("MyCatalog for user A", async function () {
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

					expect(catalogs[0]!.identifier.catalogSlug == "testA-catalog");
					expect(catalogs[0]!.isPublic).equal(false);
				} else {
					expect(true, "value to exist").equal(false);
				}
			});
	});

	it("MyCatalog for user B", async function () {
		return userBClient
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

					expect(catalogs[0]!.identifier.catalogSlug == "testB-catalog");
					expect(catalogs[0]!.isPublic).equal(false);
				} else {
					expect(true, "value to exist").equal(false);
				}
			});
	});

	it("User A Create Catalog", async function () {});

	// TODO Test private and public catalog retrieval
	// TODO Test package and catalog associations
});
