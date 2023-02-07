import { expect } from "chai";
import { BigQuery, TableField } from "@google-cloud/bigquery";
import {
    createTestPackage,
    getPromptInputs,
    removePackageFiles,
    testCmd,
    TestResults,
    KEYS,
    TEST_SOURCE_FILES
} from "../integration/test-utils";

const bigQuerySinkPrompts = [
    "Exclude any attributes from",
    "Rename attributes from",
    "Project ID?",
    "Dataset?",
    "Table Name?",
    "Insert Method?"
];

const getBigQuerySinkPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(bigQuerySinkPrompts, inputs, skip, count);

describe("Big Query Sink Test", function () {
    let packageAFilePath: string;
    const datasetAName = "local_covid_02_01_2020_v1";
    const tableAName = "test_table_a";
    let packageBFilePath: string;
    const datasetBName = "local_all_types_v1";
    const tableBName = "test_table_b";
    let packageCFilePath: string;
    const datasetCName = "local_legislators_v1";
    const tableCName = "test_table_c";
    const tableDName = "test_table_d";

    before(async function () {
        this.timeout(200000);

        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE1, true);
        packageBFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE4, true);
        packageCFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE5, true);
    });

    after(async function () {
        removePackageFiles(["covid-02-01-2020"]);
        removePackageFiles(["all-types"]);
        removePackageFiles(["legislators"]);
        process.env.GOOGLE_APPLICATION_CREDENTIALS = "";
    });

    it("Can't access to big query without service account credentials path set", async function () {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = "";

        const prompts = getBigQuerySinkPromptInputs(["No", "No"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "big-query"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === 1 && line.includes("The Application Default Credentials are not available")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't access to big query with non-existing service account credentials path", async function () {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = "non-existing";

        const prompts = getBigQuerySinkPromptInputs(["No", "No"]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "big-query"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === 1 && line.includes("no such file or directory")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't insert records to the wrong project", async function () {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_FREE_CREDENTIALS;

        const prompts = getBigQuerySinkPromptInputs(["No", "No", "", "", "", KEYS.DOWN]).filter(
            (_prompt, index) => index !== 1
        );
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "big-query", "--sinkConfig", '{"projectId":"wrong-project-id"}'],
            prompts,
            async (line: string, promptIndex: number) => {
                if (
                    promptIndex === prompts.length &&
                    line.includes("Unable to detect this Project Id in the current environment")
                ) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't insert records using streaming insert on the free tier", async function () {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_FREE_CREDENTIALS;

        const prompts = getBigQuerySinkPromptInputs(["No", "No", "", "", "", KEYS.DOWN]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "big-query"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (
                    promptIndex === prompts.length &&
                    line.includes("Streaming insert is not allowed in the free tier")
                ) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Should import data using bulk insert without error on the free plan", async function () {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_FREE_CREDENTIALS;

        const prompts = getBigQuerySinkPromptInputs(["No", "No", "", "", tableDName, ""]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "big-query"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("Finished writing 67 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should find the record counts and data types in the database", async function () {
        const client = new BigQuery();
        const table = client.dataset(datasetAName).table(tableDName);
        const [rows] = await table.getRows();
        const [metadata] = await table.getMetadata();
        const fields = metadata.schema.fields;

        expect(rows.length).equals(67);

        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Province_State" && field.type === "STRING")).to
            .exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Country_Region" && field.type === "STRING")).to
            .exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Last_Update" && field.type === "DATETIME")).to
            .exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Confirmed" && field.type === "INTEGER")).to
            .exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Deaths" && field.type === "INTEGER")).exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Recovered" && field.type === "INTEGER")).to
            .exist;
    });

    it("Should import data using streaming insert without error on the paid plan", async function () {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_PAID_CREDENTIALS;

        const prompts = getBigQuerySinkPromptInputs(["No", "No", "", "", tableAName, KEYS.DOWN]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "big-query", "--forceUpdate"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("Finished writing 67 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should not rewrite if there isn't any new records", async function () {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_PAID_CREDENTIALS;

        const prompts = getBigQuerySinkPromptInputs(["No", "No", "", "", tableAName, KEYS.DOWN]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "big-query"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("No new records available")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found no new records available message").equals(true);
    });

    it("Should resolve conflicts while importing data", async function () {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_PAID_CREDENTIALS;

        const prompts = [
            ...getBigQuerySinkPromptInputs(["No", "No", "", "", tableBName, ""]),

            {
                message: "Boolean_Integer_String has boolean and integer and string values.",
                input: `${KEYS.ENTER}`
            },
            {
                message: "Date_DateTime has date and date-time values.",
                input: `${KEYS.ENTER}`
            },
            {
                message: "all_types has boolean and date and date-time and number and string values.",
                input: `${KEYS.DOWN}${KEYS.ENTER}`
            }
        ];
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageBFilePath, "--sinkType", "big-query", "--forceUpdate"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("Finished writing 100 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should find the record counts and data types in the database after resolving conflicts", async function () {
        const client = new BigQuery();
        const table = client.dataset(datasetBName).table(tableBName);
        const [rows] = await table.getRows();
        const [metadata] = await table.getMetadata();
        const fields = metadata.schema.fields;

        expect(rows.length).equals(100);

        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Integer" && field.type === "INTEGER")).to
            .exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Float" && field.type === "FLOAT")).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Integer_Float" && field.type === "FLOAT")).to
            .exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Boolean" && field.type === "BOOLEAN")).to
            .exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            fields.find(
                (field: TableField) => field.name === "field__Boolean_Integer_String" && field.type === "STRING"
            )
        ).exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Date" && field.type === "DATE")).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__DateTime" && field.type === "DATETIME")).to
            .exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__Date_DateTime" && field.type === "DATETIME"))
            .to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__String" && field.type === "STRING")).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            fields.find((field: TableField) => field.name === "field__all_types_integer" && field.type === "INTEGER")
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__all_types_number" && field.type === "FLOAT"))
            .to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            fields.find((field: TableField) => field.name === "field__all_types_boolean" && field.type === "BOOLEAN")
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(
            fields.find((field: TableField) => field.name === "field__all_types_date_time" && field.type === "DATETIME")
        ).to.exist;
        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__all_types_string" && field.type === "STRING"))
            .to.exist;
    });

    it("Casting to null should work correctly", async function () {
        process.env.GOOGLE_APPLICATION_CREDENTIALS = process.env.GOOGLE_APPLICATION_PAID_CREDENTIALS;

        const prompts = [
            ...getBigQuerySinkPromptInputs(["No", "No", "", "", tableCName, ""]),
            {
                message: "facebook has integer and string values.",
                input: `${KEYS.DOWN}${KEYS.ENTER}`
            }
        ];
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageCFilePath, "--sinkType", "big-query", "--forceUpdate"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes("Finished writing 538 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should find the record counts and data types in the database after casting to null", async function () {
        const client = new BigQuery();
        const table = client.dataset(datasetCName).table(tableCName);
        const [rows] = await table.getRows();
        const [metadata] = await table.getMetadata();
        const fields = metadata.schema.fields;

        expect(rows.length).equals(538);

        // eslint-disable-next-line no-unused-expressions
        expect(fields.find((field: TableField) => field.name === "field__facebook" && field.type === "INTEGER")).to
            .exist;
    });
});
