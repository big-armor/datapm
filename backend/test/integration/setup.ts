import * as path from "path";
import {
	DockerComposeEnvironment,
	GenericContainer,
	StartedDockerComposeEnvironment,
	StartedTestContainer,
	Wait
} from "testcontainers";
import { expect } from "chai";
import {
	ApolloClient,
	ApolloQueryResult,
	InMemoryCache,
	NormalizedCacheObject,
	gql,
	HttpLink,
	FetchResult,
	ServerError
} from "@apollo/client/core";
import fetch from "cross-fetch";
import {
	Catalog,
	Maybe,
	MyCatalogsQuery,
	User,
	MyCatalogsDocument,
	CreateMeDocument,
	LoginDocument,
	CreateMeMutation,
	MyCatalogsQueryVariables,
	CreateMeMutationVariables
} from "./registry-client";

import execa, { ExecaChildProcess } from "execa";
import { execute } from "graphql";
import { Stream } from "stream";
import * as readline from "readline";
import { ErrorResponse, onError } from "apollo-link-error";
import pidtree from "pidtree";
import { exit } from "process";

let container: StartedTestContainer;
let serverProcess: execa.ExecaChildProcess;

function readLines(stream: NodeJS.ReadableStream) {
	const output = new Stream.PassThrough({ objectMode: true });
	console.log("output created");
	const rl = readline.createInterface({ input: stream });
	console.log("readline created");
	rl.on("line", (line) => {
		output.write(line);
	});
	rl.on("close", () => {
		output.push(null);
	});
	return output;
}

before(async function () {
	console.log("Starting postgres temporary container");

	this.timeout(50000);
	container = await new GenericContainer("postgres")
		.withEnv("POSTGRES_PASSWORD", "postgres")
		.withEnv("POSTGRES_DB", "datapm")
		.withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
		.withExposedPorts(5432)
		.start();

	const postgresPortNumber = container.getMappedPort(5432);

	console.log("Postgres started");

	serverProcess = execa("npm", ["run", "start-nowatch"], {
		env: {
			TYPEORM_PORT: postgresPortNumber.toString()
		}
	});

	serverProcess.stdout!.pipe(process.stdout);
	serverProcess.stderr!.pipe(process.stderr);

	// Wait for the server to start
	await new Promise(async (r) => {
		let serverReady = false;

		console.log("Waiting for server to start");
		serverProcess.stdout!.on("data", (buffer: Buffer) => {
			const line = buffer.toString();
			//console.log(line);
			if (line.indexOf("🚀") != -1) {
				console.log("Server started!");
				serverReady = true;
				r();
			}
		});

		serverProcess.stdout!.on("error", (err: Error) => {
			console.error(JSON.stringify(err, null, 1));
		});

		serverProcess.stdout!.on("close", () => {
			if (!serverReady) throw new Error("Registry server exited before becoming ready");
		});

		setTimeout(function () {
			if (!serverReady) throw new Error("Timedout waiting for registry server to start");
		}, 30000);
	});
});

after(async function () {
	this.timeout(30000);

	if (container) await container.stop();

	console.log("postgres container stopped normally");

	serverProcess.stdout!.destroy();
	serverProcess.stderr!.destroy();

	let pids = pidtree(serverProcess.pid, { root: true });

	// recursively kill all child processes
	(await pids).map((p) => {
		console.log("Killing process " + p);
		process.kill(p);
	});
});

function createAnonymousClient() {
	return new ApolloClient({
		cache: new InMemoryCache(),
		link: new HttpLink({ uri: "http://localhost:4000/graphql", fetch }),

		defaultOptions: {
			query: {
				errorPolicy: "all"
			},
			mutate: {
				errorPolicy: "all"
			},
			watchQuery: {
				errorPolicy: "all"
			}
		}
	});
}

/** creates a new user and returns an apollo client for their session */
async function createUser(
	firstName: string,
	lastName: string,
	username: string,
	emailAddress: string,
	password: string
): Promise<ApolloClient<NormalizedCacheObject>> {
	return await new Promise((resolve, reject) => {
		let client = createAnonymousClient();
		client
			.mutate<CreateMeMutation, CreateMeMutationVariables>({
				errorPolicy: "all",
				mutation: CreateMeDocument,
				variables: {
					value: {
						firstName: firstName,
						lastName: lastName,
						username: username,
						emailAddress: emailAddress,
						password: password
					}
				}
			})
			.catch((error) => {
				//console.error(JSON.stringify(error,null,1));
				reject(error);
			})
			.then((result) => {
				if (!result) {
					reject("This should never happen");
					return;
				}

				let token = result.data!.createMe;

				let client = new ApolloClient({
					cache: new InMemoryCache(),
					defaultOptions: {
						query: {
							errorPolicy: "all"
						},
						mutate: {
							errorPolicy: "all"
						},
						watchQuery: {
							errorPolicy: "all"
						}
					},
					link: new HttpLink({
						uri: "http://localhost:4000/graphql",
						headers: {
							Accept: "charset=utf-8",
							Authorization: "Bearer " + token
						},
						fetch
					})
				});

				resolve(client);
			});
	});
}

describe("Authentication Tests", async () => {
	let anonymousClient: ApolloClient<NormalizedCacheObject> = createAnonymousClient();
	let userAClient: ApolloClient<NormalizedCacheObject>;
	let userBClient: ApolloClient<NormalizedCacheObject>;

	before(async () => {
		expect(anonymousClient).to.exist;
	});

	it("Login for incorrect user should fail", async () => {
		let loginFailed = false;

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
