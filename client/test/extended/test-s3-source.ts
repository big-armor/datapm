import { expect } from "chai";
import { Properties } from "datapm-lib";
import {
    defaultPromptInputsForCSVs,
    loadTestPackageFile,
    removePackageFiles,
    testCmd,
    TestResults
} from "../integration/test-utils";

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
            async (line: string) => {
                if (line.includes("datapm publish ")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Validate the contents of the JSON file", async function () {
        const newPackageFile = loadTestPackageFile("us-covid");
        const columns = [
            {
                title: "submission_date",
                type: ["date"]
            },
            {
                title: "state",
                type: ["string"]
            },
            {
                title: "tot_cases",
                type: ["integer"]
            },
            {
                title: "conf_cases",
                type: ["integer"]
            },
            {
                title: "prob_cases",
                type: ["integer"]
            },
            {
                title: "new_case",
                type: ["integer"]
            },
            {
                title: "pnew_case",
                type: ["integer"]
            },
            {
                title: "tot_death",
                type: ["integer"]
            },
            {
                title: "conf_death",
                type: ["integer"]
            },
            {
                title: "prob_death",
                type: ["integer"]
            },
            {
                title: "new_death",
                type: ["integer"]
            },
            {
                title: "pnew_death",
                type: ["integer"]
            },
            {
                title: "created_at",
                type: ["date-time"]
            },
            {
                title: "consent_cases",
                type: ["string"]
            },
            {
                title: "consent_deaths",
                type: ["string"]
            }
        ];

        expect(newPackageFile.schemas.length).equals(1);
        const schema = newPackageFile.schemas[0];
        expect(schema.title).equal("us-covid");
        expect(schema.recordCount).equal(50);

        const properties = schema.properties as Properties;
        columns.forEach((column) => {
            const property = properties[column.title as string];
            expect(property.title).equal(column.title);

            expect(Object.values(property.types).reduce((acc, cur) => acc + (cur.recordCount ?? 0), 0)).equal(50);
            expect(Object.keys(property.types)).include.members(column.type);
        });
    });
});
