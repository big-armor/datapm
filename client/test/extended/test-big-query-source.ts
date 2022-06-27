import { expect } from "chai";
import execa from "execa";
import {
    getPromptInputs,
    removePackageFiles,
    testCmd,
    TestResults,
    KEYS,
    loadTestPackageFile
} from "../integration/test-utils";
import { Properties, Schema } from "datapm-lib";

/** This test requires two environment variables to run
 *
 * GOOGLE_APPLICATION_FREE_CREDENTIALS='~/Downloads/free.json' GOOGLE_APPLICATION_PAID_CREDENTIALS='~/Downloads/paid.json' npm run test:debug test/extended/test-big-query-source.ts
 *
 * free account: https://console.cloud.google.com/iam-admin/serviceaccounts/details/108609701523929708928/keys?project=datapm-big-query-test
 * paid account: https://console.cloud.google.com/iam-admin/serviceaccounts/details/116584069041072925819/keys?project=datapm-playground
 */

describe("Big Query Source Test", function () {
    before(async function () {
        this.timeout(200000);

        process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_FREE_CREDENTIALS;
    });

    after(async function () {
        removePackageFiles(["test1"]);
        removePackageFiles(["test2"]);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = "";
    });

    it("Should be SELECT query", async function () {
        const prompts = ["Fetch data from a table or a query?", "Query?"];
        const promptInputs = getPromptInputs(prompts, [KEYS.DOWN, `INSERT INTO \`project.dataset.table\``]);
        const results: TestResults = {
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            ["bigQuery://"],
            promptInputs,
            async (line: string, promptIndex: number, cmdProcess: execa.ExecaChildProcess) => {
                if (promptIndex === prompts.length && line.includes("Should be a SELECT query")) {
                    results.messageFound = true;
                    cmdProcess.kill("SIGINT");
                }
            }
        );

        expect(cmdResult.signal, "Exit signal").equals("SIGINT");
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Should fetch data from public dataset", async function () {
        const prompts = [
            "Fetch data from a table or a query?",
            "Query?",
            "Exclude any attributes",
            "Rename attributes",
            "derived from other 'upstream data'?",
            "What does each data_by_province record represent?",
            "Unit for attribute 'confirmed_cases'?",
            "User friendly package name?",
            "Package short name?",
            "Starting version?",
            "Short package description?",
            "Website?",
            "Number of sample records?",

            "Publish to registry?"
        ];
        const promptInputs = getPromptInputs(prompts, [
            KEYS.DOWN,
            `SELECT date, country, confirmed_cases FROM \`bigquery-public-data.covid19_italy.data_by_province\` LIMIT 100`,
            "n",
            "n",
            "",
            "",
            "",
            "test1",
            "test1",
            "",
            "test1",
            "https://test1.com",
            "10",
            ""
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            ["bigQuery://"],
            promptInputs,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("datapm publish ")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Validate the contents of the package file test1", async function () {
        const packageFile = loadTestPackageFile("test1");
        expect(packageFile.schemas.length).equals(1);
        const columns = [
            {
                columnName: "date",
                dataType: "date"
            },
            {
                columnName: "country",
                dataType: "string"
            },
            {
                columnName: "confirmed_cases",
                dataType: "number"
            }
        ];
        const typeMatch: Record<string, Record<string, [string]>> = {
            number: {
                type: ["number"]
            },
            string: {
                type: ["string"]
            },
            date: {
                type: ["date-time"]
            }
        };
        const schema = packageFile.schemas[0] as Schema;
        const properties = schema.properties as Properties;
        const source = packageFile.sources[0];
        expect(schema.title).equal("data_by_province");
        expect(source.type).equal("googleBigQuery");
        expect(source.configuration?.mode).equal("Query");
        expect(source.configuration?.query).equal(
            "SELECT date, country, confirmed_cases FROM `bigquery-public-data.covid19_italy.data_by_province` LIMIT 100"
        );
        columns.forEach((column) => {
            const property = properties[column.columnName as string];
            expect(property.title).equal(column.columnName);
            expect(Object.values(property.types).reduce((acc, cur) => acc + (cur.recordCount ?? 0), 0)).equal(100);
            expect(Object.keys(property.types)).include.members(typeMatch[column.dataType].format);
        });
    });

    /** Requires that test-big-query-sink has been run first */
    it("Should fetch data from private dataset", async function () {
        const prompts = [
            "Fetch data from a table or a query?",
            "Project ID?",
            "Dataset?",
            "Table Name?",
            "Exclude any attributes",
            "Rename ",
            "derived from other 'upstream data'?",
            "What does each test_table_d record represent?",
            "Do you want to specify units for the",
            "User friendly package name?",
            "Package short name?",
            "Starting version?",
            "Short package description?",
            "Website?",
            "Number of sample records?",
            "Publish to registry?"
        ];
        const promptInputs = getPromptInputs(prompts, [
            "",
            "",
            "",
            KEYS.DOWN + KEYS.DOWN,
            "n",
            "n",
            "",
            "",
            "n",
            "test2",
            "test2",
            "",
            "test2",
            "https://test2.com",
            "10",
            ""
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            ["bigQuery://"],
            promptInputs,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("datapm publish ")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Validate the contents of the package file test2", async function () {
        const packageFile = loadTestPackageFile("test2");
        expect(packageFile.schemas.length).equals(1);
        const columns = [
            {
                columnName: "field__Country_Region",
                dataType: "string"
            },
            {
                columnName: "field__Last_Update",
                dataType: "date"
            },
            {
                columnName: "field__Confirmed",
                dataType: "number"
            }
        ];
        const typeMatch: Record<string, Record<string, [string]>> = {
            number: {
                format: ["number"],
                type: ["number"]
            },
            string: {
                format: ["string"],
                type: ["string"]
            },
            date: {
                format: ["date-time"],
                type: ["string"]
            }
        };
        const schema = packageFile.schemas[0] as Schema;
        const properties = schema.properties as Properties;
        const source = packageFile.sources[0];
        expect(schema.title).equal("test_table_d");
        expect(source.type).equal("googleBigQuery");
        expect(source.configuration?.mode).equal("Table");
        expect(source.configuration?.projectId).equal("datapm-big-query-test");
        expect(source.configuration?.dataset).equal("local_covid_02_01_2020_v1");
        expect(source.configuration?.tableName).equal("test_table_d");
        columns.forEach((column) => {
            const property = properties[column.columnName as string];
            expect(property.title).equal(column.columnName);

            expect(Object.values(property.types).reduce((acc, cur) => acc + (cur.recordCount ?? 0), 0)).equal(67);
            expect(Object.keys(property.types)).include.members(typeMatch[column.dataType].format);
        });
    });
});
