import { expect } from "chai";
import { loadPackageFileFromDisk, Properties } from "datapm-lib";
import { JSONSchema7TypeName } from "json-schema";
import { removePackageFiles, TEST_SOURCE_FILES, testCmd, getPromptInputs } from "./test-utils";

describe("AVRO Source Tests", function () {
    after(() => {
        removePackageFiles(["covid-02-01-2020"]);
    });

    it("Should generate a package from AVRO file", async () => {
        const generatePackageCommandPrompts = [
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
            "Publish to registry?",
            "Target registry?",
            "Catalog short name?",
            "Data Access Method?",
            "Is the above ok?"
        ];

        const prompts = getPromptInputs(generatePackageCommandPrompts, [
            "n",
            "n",
            "",
            "",
            "n",
            "covid-02-01-2020",
            "",
            "",
            "Test",
            "https://test.datapm-not-a-site.io",
            "10",
            "no"
        ]);

        const exitCode = await testCmd("package", [TEST_SOURCE_FILES.FILE22], prompts);
        expect(exitCode.code).equal(0);
    });

    it("Package file content should be correct", async () => {
        const packageFile = loadPackageFileFromDisk("covid-02-01-2020.datapm.json");

        expect(packageFile.displayName).equal("covid-02-01-2020");

        const schema = packageFile.schemas[0];
        expect(schema.recordCount).equal(67);

        const properties = schema.properties as Properties;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties.Province_State.title === "Province_State" &&
                (properties.Province_State.type as JSONSchema7TypeName[]).join(",") === "null,string"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties.Country_Region.title === "Country_Region" &&
                (properties.Country_Region.type as JSONSchema7TypeName[]).join(",") === "string"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties.Last_Update.title === "Last_Update" &&
                (properties.Last_Update.type as JSONSchema7TypeName[]).join(",") === "string"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties.Confirmed.title === "Confirmed" &&
                (properties.Confirmed.type as JSONSchema7TypeName[]).join(",") === "number"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties.Deaths.title === "Deaths" &&
                (properties.Deaths.type as JSONSchema7TypeName[]).join(",") === "number"
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            properties.Recovered.title === "Recovered" &&
                (properties.Recovered.type as JSONSchema7TypeName[]).join(",") === "number"
        ).to.exist;
    });
});
