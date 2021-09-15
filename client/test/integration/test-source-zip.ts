import { removePackageFiles, TEST_SOURCE_FILES, testCmd, getPromptInputs } from "./test-utils";
import { expect } from "chai";
import { loadPackageFileFromDisk } from "datapm-lib";

describe("ZIP Tests", function () {
    after(() => {
        removePackageFiles(["source"]);
    });

    it("Should generate a package from ZIP file with multiple CSVs", async () => {
        const generatePackageCommandPrompts = [
            "Inner File Pattern?",
            "Is there a header line above?",
            "Header row line number?"
        ];

        const prompts = getPromptInputs(generatePackageCommandPrompts, ["leg-*.csv", "", "0"]);

        const exitCode = await testCmd("package", ["--defaults", TEST_SOURCE_FILES.FILE24], prompts);
        expect(exitCode.code).equal(0);

        const packageFile = loadPackageFileFromDisk("source.datapm.json");

        expect(packageFile.displayName).equal("source");
        expect(packageFile.schemas[0].recordCount).equal(399);
    });

    it("Should generate a package from ZIP file with a single JSON", async () => {
        const generatePackageCommandPrompts = ["Inner File Pattern?", "JSONPath for data?"];

        const prompts = getPromptInputs(generatePackageCommandPrompts, ["daily_prices.json", "*"]);

        const exitCode = await testCmd("package", ["--defaults", TEST_SOURCE_FILES.FILE24], prompts);
        expect(exitCode.code).equal(0);

        const packageFile = loadPackageFileFromDisk("source.datapm.json");

        expect(packageFile.displayName).equal("source");
        expect(packageFile.schemas[0].recordCount).equal(5953);
    });
});
