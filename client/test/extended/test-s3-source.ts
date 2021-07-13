import { expect } from "chai";
import { loadPackageFileFromDisk, Properties, Schema } from "datapm-lib";
import { defaultPromptInputsForCSVs, removePackageFiles, testCmd, TestResults } from "../integration/test-utils";

describe("S3 Source Test", function () {
    const bucketName = "datapm-test";
    const sourceS3Path = "test/sources/us-covid.csv";

    before(async function () {
        //
    });

    after(async function () {
        removePackageFiles(["us-covid"]);
    });

    it("Should generate package from s3 source without issue", async function () {
        const results: TestResults = {
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            [
                `s3://${bucketName}/${sourceS3Path}`,
                "--defaults",
                "--sourceConfiguration",
                JSON.stringify({ region: "us-east-2" })
            ],
            defaultPromptInputsForCSVs,
            (line: string) => {
                if (line.includes("datapm publish ")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Validate the contents of the JSON file", async function () {
        const newPackageFile = loadPackageFileFromDisk("us-covid.datapm.json");
        const columns = [
            {
                title: "submission_date",
                type: ["string"],
                format: ["date"]
            },
            {
                title: "state",
                type: ["string"],
                format: ["string"]
            },
            {
                title: "tot_cases",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "conf_cases",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "prob_cases",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "new_case",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "pnew_case",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "tot_death",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "conf_death",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "prob_death",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "new_death",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "pnew_death",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "created_at",
                type: ["string"],
                format: ["date-time"]
            },
            {
                title: "consent_cases",
                type: ["string"],
                format: ["string"]
            },
            {
                title: "consent_deaths",
                type: ["string"],
                format: ["string"]
            }
        ];

        expect(newPackageFile.schemas.length).equals(1);
        const schema = newPackageFile.schemas[0];
        expect(schema.title).equal("us-covid");
        expect(schema.recordCount).equal(50);

        const properties = schema.properties as Properties;
        columns.forEach((column) => {
            const property = properties[column.title as string] as Schema;
            expect(property.title).equal(column.title);
            expect(property.recordCount).equal(50);
            expect(property.format?.split(",")).include.members(column.format);
            expect(property.type).include.members(column.type);
        });
    });
});
