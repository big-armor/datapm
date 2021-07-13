import { expect } from "chai";
import { loadPackageFileFromDisk, Properties } from "datapm-lib";
import { removePackageFiles, TEST_SOURCE_FILES, testCmd, getPromptInputs } from "./test-utils";

describe("XLSX Source Tests", function () {
	after(() => {
		removePackageFiles(["covid-us"]);
	});

	it("Should generate a package from XLSX file", async () => {
		const generatePackageCommandPrompts = [
			"Exclude any attributes",
			"Rename attributes",
			"derived from other 'upstream data'?",
			"record represent",
			"Do you want to specify units",
			"Exclude any attributes",
			"Rename attributes",
			"derived from other 'upstream data'?",
			"record represent",
			"Do you want to specify units",
			"User friendly package name?",
			"Package short name?",
			"Starting version?",
			"Short package description?",
			"Website?",
			"Number of sample records?",
			"Publish to registry?"
		];

		const prompts = getPromptInputs(generatePackageCommandPrompts, [
			"n",
			"n",
			"",
			"",
			"n",
			"n",
			"n",
			"",
			"",
			"n",
			"covid-us",
			"",
			"",
			"Test",
			"https://test.datapm-not-a-site.io",
			"10",
			""
		]);

		const exitCode = await testCmd("package", [TEST_SOURCE_FILES.FILE23], prompts);
		expect(exitCode.code).equal(0);
	});

	it("Package file content should be correct", async () => {
		const packageFile = loadPackageFileFromDisk("covid-us.datapm.json");

		expect(packageFile.displayName).equal("covid-us");

		const schema1 = packageFile.schemas[0];
		expect(schema1.title).equal("us-covid");
		expect(schema1.recordCount).equal(50);
		const properties1 = schema1.properties as Properties;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.submission_date.title === "submission_date" && properties1.submission_date.format === "date")
			.to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.state.title === "state" && properties1.state.format === "string").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.tot_cases.title === "tot_cases" && properties1.tot_cases.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.conf_cases.title === "conf_cases" && properties1.conf_cases.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.prob_cases.title === "prob_cases" && properties1.prob_cases.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.new_case.title === "new_case" && properties1.new_case.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.pnew_case.title === "pnew_case" && properties1.pnew_case.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.tot_death.title === "tot_death" && properties1.tot_death.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.conf_death.title === "conf_death" && properties1.conf_death.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.prob_death.title === "prob_death" && properties1.prob_death.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.new_death.title === "new_death" && properties1.new_death.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.pnew_death.title === "pnew_death" && properties1.pnew_death.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.created_at.title === "created_at" && properties1.created_at.format === "date-time").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.consent_cases.title === "consent_cases" && properties1.consent_cases.format === "string").to
			.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties1.consent_deaths.title === "consent_deaths" && properties1.consent_deaths.format === "string")
			.to.exist;

		const schema2 = packageFile.schemas[1];
		expect(schema2.title).equal("covid-02-01-2020");
		expect(schema2.recordCount).equal(67);
		const properties2 = schema2.properties as Properties;
		// eslint-disable-next-line no-unused-expressions
		expect(
			properties2["Province/State"].title === "Province/State" &&
				properties2["Province/State"].format === "string"
		).to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(
			properties2["Country/Region"].title === "Country/Region" &&
				properties2["Country/Region"].format === "string"
		).to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties2["Last Update"].title === "Last Update" && properties2["Last Update"].format === "date-time")
			.to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties2.Confirmed.title === "Confirmed" && properties2.Confirmed.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties2.Deaths.title === "Deaths" && properties2.Deaths.format === "integer").to.exist;
		// eslint-disable-next-line no-unused-expressions
		expect(properties2.Recovered.title === "Recovered" && properties2.Recovered.format === "integer").to.exist;
	});
});
