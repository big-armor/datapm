import { expect } from "chai";
import knex, { Knex } from "knex";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { LogWaitStrategy } from "testcontainers/dist/wait-strategy";
import { SinkErrors } from "datapm-client-lib";
import { resetConfiguration } from "../../src/util/ConfigUtil";
import {
    createTestPackage,
    getPromptInputs,
    removePackageFiles,
    testCmd,
    TestResults,
    KEYS,
    TEST_SOURCE_FILES
} from "./test-utils";

const postgresSinkPrompts = [
    "Exclude any attributes from",
    "Rename attributes from",
    "Hostname or IP?",
    "Port?",
    "Username?",
    "Password?",
    "Database?",
    "Schema?"
];

const getPostgresSinkPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(postgresSinkPrompts, inputs, skip, count);

const postgresSinkPromptsWithRepository = [
    "Exclude any attributes from",
    "Rename attributes from",
    "Repository?",
    "Credentials?",
    "Database?",
    "Schema?"
];

const getPostgresSinkPromptInputsWithRepository = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(postgresSinkPromptsWithRepository, inputs, skip, count);

describe("Postgres Sink Test", function () {
    let postgresContainer: StartedTestContainer;
    let postgresHost: string;
    let postgresPort: number;
    let knexClient: Knex;
    let packageAFilePath: string;
    const schemaAName = "local_covid-02-01-2020-v1";
    const tableAName = "covid-02-01-2020";
    let packageBFilePath: string;
    const schemaBName = "local_all-types-v1";
    const tableBName = "all-types";
    let packageCFilePath: string;
    const schemaCName = "local_legislators-v1";
    const tableCName = "legislators";

    before(async function () {
        resetConfiguration();
        this.timeout(200000);

        console.log("Starting postgres sink container");
        postgresContainer = await new GenericContainer("postgres")
            .withEnv("POSTGRES_PASSWORD", "postgres")
            .withEnv("POSTGRES_DB", "datapm")
            .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
            .withExposedPorts(5432)
            .withWaitStrategy(new LogWaitStrategy("database system is ready to accept connections"))
            .start();

        postgresHost = postgresContainer.getContainerIpAddress();
        postgresPort = postgresContainer.getMappedPort(5432);

        knexClient = knex({
            client: "pg",
            connection: {
                host: postgresHost,
                port: postgresPort,
                user: "postgres",
                password: "postgres",
                database: "postgres"
            } as Knex.PgConnectionConfig
        });

        console.log("test postgress server port  " + postgresPort);

        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE1, true);
        packageBFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE4, true);
        packageCFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE5, true);
    });

    after(async function () {
        removePackageFiles(["covid-02-01-2020"]);
        removePackageFiles(["all-types"]);
        removePackageFiles(["legislators"]);
        knexClient.destroy();
        await postgresContainer.stop();
    });

    it("Can't connect to invalid URI", async function () {
        const prompts = getPostgresSinkPromptInputs([
            "No",
            "No",
            "invalid-hostname",
            "postgres",
            "password",
            "test-db",
            "schema"
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "postgres"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes(SinkErrors.CONNECTION_FAILED)) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't connect to database with wrong credential", async function () {
        resetConfiguration();

        const prompts = getPostgresSinkPromptInputs([
            "No",
            "No",
            postgresHost,
            postgresPort.toString(),
            "username",
            "password",
            "test-db",
            "schema"
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "postgres"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes(SinkErrors.AUTHENTICATION_FAILED)) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    /* it("Can't create database with invalid name", async function () {
        resetConfiguration();

        const prompts = getPostgresSinkPromptInputs([
            postgresHost,
            postgresPort.toString(),
            "postgres",
            "postgres",
            "invalid database $$$"
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "postgres"],
            prompts,
            async (line: string, promptIndex: number) => {
                console.log(line);

                if (promptIndex === prompts.length && line.includes("syntax error")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    }); */

    it("Should import data without error", async function () {
        resetConfiguration();

        const prompts = getPostgresSinkPromptInputs([
            "No",
            "No",
            postgresHost,
            postgresPort.toString(),
            "postgres",
            "postgres"
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "postgres"],
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
        try {
            const recordCount = await knexClient.withSchema(schemaAName).table(tableAName).count();
            expect(recordCount[0].count).equals("67");

            const columnCount = await knexClient
                .table("information_schema.columns")
                .where({ table_name: tableAName })
                .count();

            expect(columnCount[0].count).equals("6");

            const columns = await knexClient
                .table("information_schema.columns")
                .where({ table_name: tableAName })
                // eslint-disable-next-line camelcase
                .select<[{ column_name: string; data_type: string }]>(["column_name", "data_type"]);

            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "Province/State" && column.data_type === "text")).to
                .exist;
            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "Country/Region" && column.data_type === "text")).to
                .exist;
            // eslint-disable-next-line no-unused-expressions
            expect(
                columns.find(
                    (column) =>
                        column.column_name === "Last Update" && column.data_type === "timestamp without time zone"
                )
            ).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "Confirmed" && column.data_type === "bigint")).to
                .exist;
            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "Deaths" && column.data_type === "bigint")).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "Recovered" && column.data_type === "bigint")).to
                .exist;
        } finally {
            //
        }
    });

    it("Should not rewrite if there isn't any new records", async function () {
        resetConfiguration();

        const prompts = getPostgresSinkPromptInputs([
            "No",
            "No",
            postgresHost,
            postgresPort.toString(),
            "postgres",
            "postgres"
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "postgres"],
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

    it("Record count shouldn't be changed", async function () {
        try {
            const recordCount = await knexClient.withSchema(schemaAName).table(tableAName).count();
            expect(recordCount[0].count).equals("67");
        } finally {
            //
        }
    });

    it("Should import data again if force update flag set", async function () {
        resetConfiguration();

        const prompts = getPostgresSinkPromptInputs([
            "No",
            "No",
            postgresHost,
            postgresPort.toString(),
            "postgres",
            "postgres",
            "",
            ""
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "postgres", "--force-update"],
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

    it("Record count shouldn't be changed after force update", async function () {
        try {
            const recordCount = await knexClient.withSchema(schemaAName).table(tableAName).count();
            expect(recordCount[0].count).equals("67");
        } finally {
            //
        }
    });

    it("Should resolve conflicts while importing data", async function () {
        resetConfiguration();

        const prompts = [
            ...getPostgresSinkPromptInputs([
                "No",
                "No",
                postgresHost,
                postgresPort.toString(),
                "postgres",
                "postgres",
                "",
                ""
            ]),
            {
                message: "Boolean_Integer_String has boolean and integer and string values.",
                input: `${KEYS.ENTER}`
            },
            {
                message: "Date_DateTime has date and date-time values",
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
            [packageBFilePath, "--sinkType", "postgres"],
            prompts,
            async (line: string, promptIndex: number) => {
                // console.log(line);
                if (promptIndex === prompts.length && line.includes("Finished writing 100 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should find the record counts and data types in the database after resolving conflicts", async function () {
        try {
            const recordCount = await knexClient.withSchema(schemaBName).table(tableBName).count();
            expect(recordCount[0].count).equals("100");

            const columnCount = await knexClient
                .table("information_schema.columns")
                .where({ table_name: tableBName })
                .count();
            expect(columnCount[0].count).equals("14");

            const columns = await knexClient
                .table("information_schema.columns")
                .where({ table_name: tableBName })
                // eslint-disable-next-line camelcase
                .select<[{ column_name: string; data_type: string }]>(["column_name", "data_type"]);

            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "Integer" && column.data_type === "bigint")).to
                .exist;
            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "Float" && column.data_type === "double precision"))
                .to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(
                columns.find(
                    (column) => column.column_name === "Integer_Float" && column.data_type === "double precision"
                )
            ).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "Boolean" && column.data_type === "boolean")).to
                .exist;
            // eslint-disable-next-line no-unused-expressions
            expect(
                columns.find((column) => column.column_name === "Boolean_Integer_String" && column.data_type === "text")
            ).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "Date" && column.data_type === "date")).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(
                columns.find(
                    (column) => column.column_name === "DateTime" && column.data_type === "timestamp without time zone"
                )
            ).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(
                columns.find(
                    (column) =>
                        column.column_name === "Date_DateTime" && column.data_type === "timestamp without time zone"
                )
            ).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "String" && column.data_type === "text")).to.exist;

            // eslint-disable-next-line no-unused-expressions
            expect(
                columns.find(
                    (column) => column.column_name === "all_types-number" && column.data_type === "double precision"
                )
            ).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(
                columns.find((column) => column.column_name === "all_types-boolean" && column.data_type === "boolean")
            ).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(
                columns.find(
                    (column) =>
                        column.column_name === "all_types-date-time" &&
                        column.data_type === "timestamp without time zone"
                )
            ).to.exist;
            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "all_types-string" && column.data_type === "text"))
                .to.exist;
        } finally {
            //
        }
    });

    it("Casting to null should work correctly", async function () {
        resetConfiguration();

        const prompts = [
            ...getPostgresSinkPromptInputs([
                "No",
                "No",
                postgresHost,
                postgresPort.toString(),
                "postgres",
                "postgres",
                "",
                ""
            ]),
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
            [packageCFilePath, "--sinkType", "postgres"],
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
        try {
            const recordCount = await knexClient.withSchema(schemaCName).table(tableCName).count();
            expect(recordCount[0].count).equals("538");

            const columnCount = await knexClient
                .table("information_schema.columns")
                .where({ table_name: tableCName })
                .count();

            const columns = await knexClient
                .table("information_schema.columns")
                .where({ table_name: tableCName })
                // eslint-disable-next-line camelcase
                .select<[{ column_name: string; data_type: string }]>(["column_name", "data_type"]);

            expect(columnCount[0].count).equals("33");

            // eslint-disable-next-line no-unused-expressions
            expect(columns.find((column) => column.column_name === "facebook" && column.data_type === "bigint")).to
                .exist;
        } finally {
            //
        }
    });

    it("Should use saved repository config to connect again", async function () {
        const prompts = [
            ...getPostgresSinkPromptInputsWithRepository(["No", "No", postgresHost, "postgres"]),
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
            [packageCFilePath, "--forceUpdate", "--sinkType", "postgres"],
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

    it("Should allow refetch without any additional info", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [
                packageCFilePath,
                "--forceUpdate",
                "--excludeSchemaProperties",
                "{}",
                "--renameSchemaProperties",
                "{}",
                "--sinkType",
                "postgres",
                "--sinkRepository",
                postgresHost + ":" + postgresPort,
                "--sinkAccount",
                "postgres",
                "--sinkConfig",
                '{"database":"postgres","schema":"local_legislators-v1","deconflictOptions":{"facebook":"CAST_TO_NULL"}}'
            ],
            [],
            async (line: string) => {
                if (line.includes("Finished writing 538 records")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });
});
