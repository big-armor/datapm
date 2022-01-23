import { expect } from "chai";
import { loadPackageFileFromDisk, Properties, Schema } from "datapm-lib";
import Knex from "knex";
import { GenericContainer, StartedTestContainer } from "testcontainers";
import { LogWaitStrategy } from "testcontainers/dist/wait-strategy";
import { SourceErrors } from "../../src/repository/Source";
import { resetConfiguration } from "../../src/util/ConfigUtil";
import {
    createTestPackage,
    getPromptInputs,
    KEYS,
    PromptInput,
    removePackageFiles,
    testCmd,
    TestResults,
    TEST_SOURCE_FILES
} from "./test-utils";

const postgresSourcePrompts = ["Hostname or IP?", "Port?", "Username?", "Password?", "Database?", "Schema?", "Tables?"];

const getPostgresSourcePromptInputs = (inputs?: Array<string | null>, skip = 0, lastIndex = 20) =>
    getPromptInputs(postgresSourcePrompts, inputs, skip, lastIndex);

describe("Postgres Source Test", function () {
    let postgresContainer: StartedTestContainer;
    let postgresHost: string;
    let postgresPort: number;
    let knexClient: Knex;
    let packageAFilePath: string;
    const schemaAName = "undefined_covid-02-01-2020-v1";

    before(async function () {
        resetConfiguration();
        this.timeout(200000);

        console.log("Starting postgres source container");
        postgresContainer = await new GenericContainer("postgres")
            .withEnv("POSTGRES_PASSWORD", "postgres")
            .withEnv("POSTGRES_DB", "datapm")
            .withTmpFs({ "/temp_pgdata": "rw,noexec,nosuid,size=65536k" })
            .withExposedPorts(5432)
            .withWaitStrategy(new LogWaitStrategy("database system is ready to accept connections"))
            .start();

        postgresHost = postgresContainer.getContainerIpAddress();
        postgresPort = postgresContainer.getMappedPort(5432);

        knexClient = Knex({
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
            ...getPostgresSourcePromptInputs([
                postgresHost,
                postgresPort.toString(),
                "postgres",
                "postgres",
                "",
                "",
                ""
            ])
        ];
        const exitCode = await testCmd("fetch", [packageAFilePath, "--sink", "postgres"], prompts);

        expect(exitCode.code).to.equal(0);
    });

    after(async function () {
        removePackageFiles(["covid-02-01-2020"]);
        removePackageFiles(["postgres"]);
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
        const newPackageFile = loadPackageFileFromDisk("covid-02-01-2020.datapm.json");
        const columns = await knexClient("information_schema.columns").where({ table_name: "covid-02-01-2020" });
        const typeMatch: Record<string, Record<string, [string]>> = {
            boolean: {
                format: ["boolean"],
                type: ["boolean"]
            },
            bigint: {
                format: ["integer"],
                type: ["number"]
            },
            real: {
                format: ["number"],
                type: ["number"]
            },
            text: {
                format: ["string"],
                type: ["string"]
            },
            date: {
                format: ["date-time"],
                type: ["string"]
            },
            "timestamp without time zone": {
                format: ["date-time"],
                type: ["string"]
            }
        };
        expect(newPackageFile.schemas.length).equals(1);
        columns.forEach((column) => {
            const properties = newPackageFile.schemas[0].properties as Properties;
            const property = properties[column.column_name as string] as Schema;
            expect(property.title).equal(column.column_name);
            expect(property.recordCount).equal(67);
            expect(property.format?.split(",")).include.members(typeMatch[column.data_type].format);
            expect(property.type).include.members(typeMatch[column.data_type].type);
        });
    });

    it("Should allow the user to select from a previously known repository", async function () {
        const prompts: PromptInput[] = [
            {
                message: "Repository?",
                input: "localhost" + KEYS.ENTER
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
});
