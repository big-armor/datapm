import { expect } from "chai";
import { loadPackageFileFromDisk, Properties, Schema } from "datapm-lib";
import { KEYS, removePackageFiles, testCmd, TestResults, TEST_SOURCE_FILES } from "./test-utils";

describe("Googlesheet Source Test", function () {
    before(async function () {
        //
    });

    after(async function () {
        removePackageFiles(["test-sheet"]);
    });

    it("Should fallback to asking for URL when one is not provided", async function () {
        const results: TestResults = {
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            ["--defaults"],
            [
                {
                    message: "Source?",
                    input: "googlesheet" + KEYS.ENTER
                },
                {
                    message: "URL of Google Sheet?",
                    input: TEST_SOURCE_FILES.GOOGLESHEET1 + KEYS.ENTER
                },
                {
                    message: "Is there a header line above?",
                    input: "Y"
                },
                {
                    message: "Header row line number?",
                    input: "0" + KEYS.ENTER
                },
                {
                    message: "Is there a header line above?",
                    input: "Y"
                },
                {
                    message: "Header row line number?",
                    input: "0" + KEYS.ENTER
                }
            ],
            (line: string) => {
                if (line.includes("datapm publish ")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should generate package from public googlesheet source without issue", async function () {
        const results: TestResults = {
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            [TEST_SOURCE_FILES.GOOGLESHEET1, "--defaults"],
            [
                {
                    message: "Is there a header line above?",
                    input: "Y"
                },
                {
                    message: "Header row line number?",
                    input: "0" + KEYS.ENTER
                },
                {
                    message: "Is there a header line above?",
                    input: "Y"
                },
                {
                    message: "Header row line number?",
                    input: "0" + KEYS.ENTER
                }
            ], // there are two sheets
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
        const newPackageFile = loadPackageFileFromDisk("test-sheet.datapm.json");

        expect(newPackageFile.schemas.length).equals(2);

        const columns1 = [
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

        const schema1 = newPackageFile.schemas[0];
        expect(schema1.title).equal("us-covid");
        expect(schema1.recordCount).equal(50);

        const properties1 = schema1.properties as Properties;
        columns1.forEach((column) => {
            const property = properties1[column.title as string] as Schema;
            expect(property.title).equal(column.title);
            expect(property.recordCount).equal(50);
            expect(property.format?.split(",")).include.members(column.format);
            expect(property.type).include.members(column.type);
        });

        const columns2 = [
            {
                title: "Province/State",
                type: ["string"],
                format: ["string"]
            },
            {
                title: "Country/Region",
                type: ["string"],
                format: ["string"]
            },
            {
                title: "Last Update",
                type: ["string"],
                format: ["date-time"]
            },
            {
                title: "Confirmed",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "Deaths",
                type: ["number"],
                format: ["integer"]
            },
            {
                title: "Recovered",
                type: ["number"],
                format: ["integer"]
            }
        ];
        const schema2 = newPackageFile.schemas[1];
        expect(schema2.title).equal("covid-02-01-2020");
        expect(schema2.recordCount).equal(67);

        const properties2 = schema2.properties as Properties;
        columns2.forEach((column) => {
            const property = properties2[column.title as string] as Schema;
            expect(property.title).equal(column.title);
            expect(property.recordCount).equal(67);
            expect(property.format?.split(",")).include.members(column.format);
            expect(property.type).include.members(column.type);
        });
    });
});
