import { createApiKey, createTestPackage, createTestUser, removePackageFiles, KEYS } from "./test-utils";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import { loadPackageFileFromDisk } from "datapm-lib";
import { expect } from "chai";

describe("CSV Tests", function () {
	before(async () => {
		resetConfiguration();
		const userAClient = await createTestUser();
		const apiKey = await createApiKey(userAClient);
		addRegistry({
			url: `http://localhost:${registryServerPort}`,
			apiKey
		});
	});

	after(() => {
		removePackageFiles(["non-profits-1"]);
	});

	it("Should read multiple CSV files", async () => {
		const packageFilePath = await createTestPackage(
			["file://./test/sources/non-profits-*.csv"],
			true,
			"non profits",
			"US based non profits",
			"",
			[
				{
					message: "What does each airports-small record represent?",
					input: "airport\n"
				},
				{
					message: "Do you want to specify ",
					input: KEYS.ENTER
				}
			]
		);

		const packageFile = loadPackageFileFromDisk(packageFilePath);

		expect(packageFilePath.endsWith("non-profits.datapm.json")).eq(true);
		expect(packageFile.displayName).equal("non-profits");
		expect(packageFile.schemas[0].recordCount).equal(396);
	});
});
