import { expect } from "chai";
import mongoose from "mongoose";
import { GenericContainer, StartedTestContainer } from "testcontainers";
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

const mongoSinkPrompts = [
    "Exclude any attributes from",
    "Rename attributes from",
    "Hostname or IP?",
    "Port?",
    "Username?",
    "Password?",
    "Database?"
];

const getMongoSinkPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(mongoSinkPrompts, inputs, skip, count);

describe("Mongo Sink Test", function () {
    let mongoContainer: StartedTestContainer;
    let mongoHost: string;
    let mongoPort: number;
    let mongoUri: string;
    let packageAFilePath: string;
    const collectionAName = "local_covid-02-01-2020-v1_covid-02-01-2020";
    let packageBFilePath: string;
    const collectionBName = "local_all-types-v1_all-types";
    let packageCFilePath: string;
    const collectionCName = "local_legislators-v1_legislators";

    before(async function () {
        resetConfiguration();
        this.timeout(200000);

        console.log("Starting Mongo Sink Container");
        mongoContainer = await new GenericContainer("mongo").withExposedPorts(27017).start();

        mongoHost = mongoContainer.getContainerIpAddress();
        mongoPort = mongoContainer.getMappedPort(27017);
        mongoUri = `mongodb://${mongoHost}:${mongoPort}/datapm`;

        console.log("Mongo uri: " + mongoUri);

        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE1, true);
        packageBFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE4, true);
        packageCFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE5, true);

        expect(packageAFilePath.length).to.be.greaterThan(0);
        expect(packageBFilePath.length).to.be.greaterThan(0);
        expect(packageCFilePath.length).to.be.greaterThan(0);
    });

    after(async function () {
        removePackageFiles(["covid-02-01-2020"]);
        removePackageFiles(["all-types"]);
        removePackageFiles(["legislators"]);
        await mongoContainer.stop();
    });

    /* it("Can't connect to unreachable mongo URI", async function () {
        const prompts = getMongoSinkPromptInputs([ "localhost", "333", "", "", ""]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "mongo"],
            prompts,
            async (line: string, promptIndex: number) => {
                if (promptIndex === prompts.length && line.includes(SinkErrors.CONNECTION_FAILED)) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    }); */

    it("Can't connect to mongo URI with wrong credential", async function () {
        resetConfiguration();

        const prompts = getMongoSinkPromptInputs([
            "No",
            "No",
            mongoHost,
            mongoPort.toString(),
            "username",
            "password",
            ""
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "mongo"],
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

    it("Should import data without error", async function () {
        resetConfiguration();

        const prompts = getMongoSinkPromptInputs(["No", "No", mongoHost, mongoPort.toString(), "", "", ""]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "mongo"],
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
        const client = await mongoose.connect(mongoUri, {
            useFindAndModify: false,
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true
        });
        const recordCount = await client.connection.collection(collectionAName, {}).countDocuments();
        expect(recordCount).equals(67);

        const firstRecord = await client.connection.collection(collectionAName, {}).findOne({});

        expect(typeof firstRecord["Province/State"]).equals("string");
        expect(firstRecord["Province/State"]).equals("Hubei");
        expect(typeof firstRecord["Country/Region"]).equals("string");
        expect(typeof firstRecord.Confirmed).equals("number");
        expect(typeof firstRecord.Deaths).equals("number");
        expect(typeof firstRecord.Recovered).equals("number");
        expect(firstRecord["Last Update"] instanceof Date).equals(true);

        await client.connection.close();
    });

    it("Should not rewrite if there isn't any new records", async function () {
        resetConfiguration();

        const prompts = getMongoSinkPromptInputs(["No", "No", mongoHost, mongoPort.toString(), "", "", ""]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "mongo"],
            prompts,
            async (line: string) => {
                if (line.includes("No new records available")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found no new records available message").equals(true);
    });

    it("Record count shouldn't be changed", async function () {
        const client = await mongoose.connect(mongoUri, {
            useFindAndModify: false,
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true
        });
        const recordCount = await client.connection.collection(collectionAName, {}).countDocuments();
        expect(recordCount).equals(67);
        await client.connection.close();
    });

    it("Should import data again if force-update flag set", async function () {
        resetConfiguration();

        const prompts = getMongoSinkPromptInputs(["No", "No", mongoHost, mongoPort.toString(), "", "", ""]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "fetch",
            [packageAFilePath, "--sinkType", "mongo", "--force-update"],
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
        const client = await mongoose.connect(mongoUri, {
            useFindAndModify: false,
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true
        });
        const recordCount = await client.connection.collection(collectionAName, {}).countDocuments();
        expect(recordCount).equals(67);
        await client.connection.close();
    });

    it("Should resolve conflicts while importing data", async function () {
        resetConfiguration();

        const prompts = [
            ...getMongoSinkPromptInputs(["No", "No", mongoHost, mongoPort.toString(), "", "", ""]),
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
            [packageBFilePath, "--sinkType", "mongo"],
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
        const client = await mongoose.connect(mongoUri, {
            useFindAndModify: false,
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true
        });
        const recordCount = await client.connection.collection(collectionBName, {}).countDocuments();
        expect(recordCount).equals(100);

        const firstRecord = await client.connection.collection(collectionBName, {}).findOne({});

        expect(typeof firstRecord.Integer).equals("number");
        expect(typeof firstRecord.Float).equals("number");
        expect(typeof firstRecord.Integer_Float).equals("number");
        expect(typeof firstRecord.Boolean).equals("boolean");
        expect(typeof firstRecord.Boolean_Integer_String).equals("string");
        expect(firstRecord.Date instanceof Date).equals(true);
        expect(firstRecord.DateTime instanceof Date).equals(true);
        expect(firstRecord.Date_DateTime instanceof Date).equals(true);
        expect(firstRecord.Date_DateTime.toISOString()).equals("2011-04-22T00:00:00.000Z");
        expect(typeof firstRecord.String).equals("string");
        expect(typeof firstRecord.all_types_number).equals("number");
        const lastRecord = await client.connection.collection(collectionBName, {}).findOne({
            Integer: 589
        });

        expect(lastRecord.Date_DateTime.toISOString()).equals("2013-10-19T06:58:43.000Z");

        await client.connection.close();
    });

    it("Casting to null should work correctly", async function () {
        resetConfiguration();

        const prompts = [
            ...getMongoSinkPromptInputs(["No", "No", mongoHost, mongoPort.toString(), "", "", ""]),
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
            [packageCFilePath, "--sinkType", "mongo"],
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
        const client = await mongoose.connect(mongoUri, {
            useFindAndModify: false,
            useNewUrlParser: true,
            useCreateIndex: true,
            useUnifiedTopology: true
        });
        const recordCount = await client.connection.collection(collectionCName, {}).countDocuments();
        expect(recordCount).equals(538);

        let isCorrectType = true;
        const allRecords = await client.connection.collection(collectionCName, {}).find({}).toArray();
        allRecords.forEach((record) => {
            isCorrectType =
                isCorrectType &&
                (record.facebook === undefined || record.facebook === null || typeof record.facebook === "number");
        });

        expect(isCorrectType).equals(true);

        await client.connection.close();
    });
});
