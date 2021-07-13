import { ApolloClient, NormalizedCacheObject } from "@apollo/client";
import { expect } from "chai";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
	createApiKey,
	createTestUser,
	getPromptInputs,
	KEYS,
	removePackageFiles,
	testCmd,
	TestResults,
	TEST_SOURCE_FILES
} from "./test-utils";

import { loadPackageFileFromDisk } from "datapm-lib";

const generateCommandPromptsWithDerivedFrom = [
	"Is there a header line above?",
	"Header row line number?",
	"How are files updated?",
	"Exclude any attributes",
	"Rename attributes",
	"derived from other 'upstream data'?",
	"URL for the 'upstream data'?",
	"Name of data from above URL?",
	"derived from additional 'upstream data'?",
	"What SQL or other process was used to derive this data?",
	"User friendly package name?",
	"Package short name?",
	"Starting version?",
	"Short package description?",
	"Website?",
	"Number of sample records?",
	"Publish to registry?",
	"Target registry?",
	"Catalog short name?"
];

const getGenerateCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
	getPromptInputs(generateCommandPromptsWithDerivedFrom, inputs, skip, count);

describe("Package - Derived From", () => {
	let apiKey = "";

	before(async () => {
		resetConfiguration();

		const userAClient: ApolloClient<NormalizedCacheObject> = await createTestUser();
		apiKey = await createApiKey(userAClient);
		addRegistry({
			url: `http://localhost:${registryServerPort}`,
			apiKey
		});
	});

	it("should generate package with derived from description and url", async () => {
		const prompts = getGenerateCommandPromptInputs([
			"",
			"",
			"",
			"",
			"",
			KEYS.DOWN + KEYS.ENTER,
			"https://test.datapm-not-a-site.io",
			"Upstream Data",
			"",
			"There was some stuff done",
			"Package A",
			"",
			"",
			"This is a short description",
			"",
			"10",
			KEYS.DOWN,
			KEYS.DOWN,
			""
		]);
		prompts.splice(10, 0, {
			message: "What does each state-codes record represent?",
			input: KEYS.ENTER
		});
		const results: TestResults = {
			exitCode: -1,
			messageFound: false
		};

		const cmdResult = await testCmd("package", [TEST_SOURCE_FILES.HTTP1], prompts, (line: string) => {
			if (line.includes("Share the command below to fetch the data in this package")) {
				results.messageFound = true;
			}
		});

		expect(cmdResult.code, "Exit code").equals(0);
		expect(results.messageFound, "Found success message").equals(true);

		const packageFileObject = loadPackageFileFromDisk("package-a.datapm.json");

		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		expect(packageFileObject.schemas[0].derivedFrom![0].url).equal("https://test.datapm-not-a-site.io");
		// eslint-disable-next-line @typescript-eslint/no-non-null-assertion
		expect(packageFileObject.schemas[0].derivedFrom![0].displayName).equal("Upstream Data");
		expect(packageFileObject.schemas[0].derivedFromDescription).equal("There was some stuff done");

		removePackageFiles(["package-a"]);
	});
});
