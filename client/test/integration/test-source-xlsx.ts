import { expect } from "chai";
import { Properties } from "datapm-lib";
import { removePackageFiles, TEST_SOURCE_FILES, testCmd, getPromptInputs, loadTestPackageFile } from "./test-utils";

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
            "Exclude any attributes",
            "Rename attributes",
            "derived from other 'upstream data'?",
            "record represent",
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
            "",
            "",
            "covid-us",
            "",
            "",
            "Test",
            "https://test.datapm-not-a-site.io",
            "10",
            "no"
        ]);

        const exitCode = await testCmd("package", [TEST_SOURCE_FILES.FILE23], prompts);
        expect(exitCode.code).equal(0);
    });

    it("Package file content should be correct", async () => {
        const packageFile = loadTestPackageFile("covid-us");

        expect(packageFile.displayName).equal("covid-us");

        const schema1 = packageFile.schemas[0];
        expect(schema1.title).equal("us-covid");
        expect(schema1.recordCount).equal(50);
        const properties1 = schema1.properties as Properties;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.submission_date.title === "submission_date" &&
                Object.keys(properties1.submission_date.types).join(",") === "date"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(properties1.state.title === "state" && Object.keys(properties1.state.types).join(",") === "string").to
            .exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.tot_cases.title === "tot_cases" &&
                Object.keys(properties1.tot_cases.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.conf_cases.title === "conf_cases" &&
                Object.keys(properties1.conf_cases.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.prob_cases.title === "prob_cases" &&
                Object.keys(properties1.prob_cases.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.new_case.title === "new_case" && Object.keys(properties1.new_case.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.pnew_case.title === "pnew_case" &&
                Object.keys(properties1.pnew_case.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.tot_death.title === "tot_death" &&
                Object.keys(properties1.tot_death.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.conf_death.title === "conf_death" &&
                Object.keys(properties1.conf_death.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.prob_death.title === "prob_death" &&
                Object.keys(properties1.prob_death.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.new_death.title === "new_death" &&
                Object.keys(properties1.new_death.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.pnew_death.title === "pnew_death" &&
                Object.keys(properties1.pnew_death.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.created_at.title === "created_at" &&
                Object.keys(properties1.created_at.types).join(",") === "date-time"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.consent_cases.title === "consent_cases" &&
                Object.keys(properties1.consent_cases.types).join(",") === "string"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties1.consent_deaths.title === "consent_deaths" &&
                Object.keys(properties1.consent_deaths.types).join(",") === "string"
        ).to.exist;

        const schema2 = packageFile.schemas[1];
        expect(schema2.title).equal("covid-02-01-2020");
        expect(schema2.recordCount).equal(67);
        const properties2 = schema2.properties as Properties;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties2["Province/State"].title === "Province/State" &&
                Object.keys(properties2["Province/State"].types).join(",") === "string"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties2["Country/Region"].title === "Country/Region" &&
                Object.keys(properties2["Country/Region"].types).join(",") === "string"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties2["Last Update"].title === "Last Update" &&
                Object.keys(properties2["Last Update"].types).join(",") === "date-time"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties2.Confirmed.title === "Confirmed" &&
                Object.keys(properties2.Confirmed.types).join(",") === "integer"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(properties2.Deaths.title === "Deaths" && Object.keys(properties2.Deaths.types).join(",") === "integer")
            .to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties2.Recovered.title === "Recovered" &&
                Object.keys(properties2.Recovered.types).join(",") === "integer"
        ).to.exist;
    });
});
