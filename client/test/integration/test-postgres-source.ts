import { expect } from "chai";
import { Properties } from "datapm-lib";
import knex, { Knex } from "knex";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { LogWaitStrategy } from "testcontainers/dist/wait-strategy";
import { SourceErrors } from "datapm-client-lib";
import { resetConfiguration } from "../../src/util/ConfigUtil";
import {
    createTestPackage,
    getPromptInputs,
    KEYS,
    loadTestPackageFile,
    PromptInput,
    removePackageFiles,
    testCmd,
    TestResults,
    TEST_SOURCE_FILES
} from "./test-utils";
import fs from "fs";

const postgresSinkPromptInputs = [
    "Exclude any attributes from",
    "Rename attributes from",
    "Hostname or IP?",
    "Port?",
    "Username?",
    "Password?",
    "Database?",
    "Schema?",
    "Tables?"
];

const getPostgresSinkPromptInputs = (inputs?: Array<string | null>, skip = 0, lastIndex = 20) =>
    getPromptInputs(postgresSinkPromptInputs, inputs, skip, lastIndex);

const postgresSourcePrompts = ["Hostname or IP?", "Port?", "Username?", "Password?", "Database?", "Schema?", "Tables?"];

const getPostgresSourcePromptInputs = (inputs?: Array<string | null>, skip = 0, lastIndex = 20) =>
    getPromptInputs(postgresSourcePrompts, inputs, skip, lastIndex);

describe("Postgres Source Test", function () {
    let postgresContainer: StartedTestContainer;
    let postgresHost: string;
    let postgresPort: number;
    let knexClient: Knex;
    let packageAFilePath: string;
    const schemaAName = "local_covid-02-01-2020-v1";

    before(async function () {
        resetConfiguration();
        this.timeout(200000);

        console.log("Starting postgres source container");
        postgresContainer = await new GenericContainer("postgres", "13.3")
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
        const prompts = [
            ...getPostgresSinkPromptInputs([
                "No",
                "No",
                postgresHost,
                postgresPort.toString(),
                "postgres",
                "postgres",
                "",
                "",
                ""
            ])
        ];
        const exitCode = await testCmd("fetch", [packageAFilePath, "--sinkType", "postgres"], prompts);

        expect(exitCode.code).to.equal(0);
    });

    after(async function () {
        removePackageFiles(["covid-02-01-2020"]);
        removePackageFiles(["postgres"]);
        if (fs.existsSync("covid-02-01-2020.json")) fs.rmSync("covid-02-01-2020.json");
        knexClient.destroy();
        await postgresContainer.stop();
    });

    it("Can't connect to invalid URI", async function () {
        const prompts = getPostgresSourcePromptInputs(["test", "test", "test", "schema"], 2, 6);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            [`postgres://invalid-hostname/database`],
            prompts,
            async (line: string) => {
                if (line.includes(SourceErrors.CONNECTION_FAILED)) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't connect to database with wrong credential", async function () {
        resetConfiguration();
        const prompts = getPostgresSourcePromptInputs(["username", "password", "", "schema"], 2, 6);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            [`postgres://${postgresHost}:${postgresPort}/database`],
            prompts,
            async (line: string) => {
                if (line.includes(SourceErrors.AUTHENTICATION_FAILED)) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Should generate package from postgres source without issue", async function () {
        const prompts: PromptInput[] = [];
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            [
                `postgres://${postgresHost}:${postgresPort}/postgres`,
                "--defaults",
                "--credentials",
                JSON.stringify({ username: "postgres", password: "postgres" }),
                "--configuration",
                JSON.stringify({ schema: schemaAName })
            ],
            prompts,
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
        const newPackageFile = loadTestPackageFile("covid-02-01-2020");
        const columns = await knexClient("information_schema.columns").where({ table_name: "covid-02-01-2020" });
        const typeMatch: Record<string, Record<string, [string]>> = {
            boolean: {
                type: ["boolean"]
            },
            bigint: {
                type: ["string"]
            },
            integer: {
                type: ["integer"]
            },
            real: {
                type: ["number"]
            },
            text: {
                type: ["string"]
            },
            date: {
                type: ["date-time"]
            },
            "timestamp without time zone": {
                type: ["date-time"]
            }
        };
        expect(newPackageFile.schemas.length).equals(1);
        columns.forEach((column) => {
            const properties = newPackageFile.schemas[0].properties as Properties;
            const property = properties[column.column_name as string];
            expect(property.title).equal(column.column_name);
            expect(Object.values(property.types).reduce((acc, curr) => acc + (curr.recordCount ?? 0), 0)).equal(67);
            expect(Object.keys(property.types)).include.members(typeMatch[column.data_type].type);
        });
    });

    it("Should allow the user to select from a previously known repository", async function () {
        const prompts: PromptInput[] = [
            {
                message: "Repository?",
                input: postgresHost + KEYS.ENTER
            },
            {
                message: "Credentials?",
                input: "postgres" + KEYS.ENTER
            }
        ];
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "package",
            [`postgres://`, "--defaults", "--configuration", JSON.stringify({ schema: schemaAName })],
            prompts,
            async (line: string) => {
                if (line.includes("datapm publish ")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("should allow fetch of data", async function () {
        const prompts: PromptInput[] = [
            { message: "Exclude any attributes from covid-02-01-2020?", input: "No" + KEYS.ENTER },
            { message: "Rename attributes from covid-02-01-2020?", input: "No" + KEYS.ENTER },

            {
                message: "Credentials?",
                input: "postgres" + KEYS.ENTER
            },
            {
                message: "Sink Connector?",
                input: "Local" + KEYS.ENTER
            },
            {
                message: "File format?",
                input: "JSON" + KEYS.ENTER
            },
            {
                message: "File Location?",
                input: "./" + KEYS.ENTER
            }
        ];
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("fetch", ["local/covid-02-01-2020"], prompts, async (line: string) => {
            // console.log(line);
            if (line.includes("datapm fetch ")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);

        const file = fs.readFileSync("./covid-02-01-2020.json", "utf8");

        const lines = file.split("\n");

        const firstLine = JSON.parse(lines[0]);

        expect(lines.length).equal(68);
        expect(firstLine["Last Update"]).equal("2020-02-01T11:53:00.000Z");
    });

    // TODO Test that you can use the package
});
