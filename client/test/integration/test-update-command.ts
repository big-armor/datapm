import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk, PackageFile, Properties } from "datapm-lib";
import faker from "faker";
import fs from "fs";
import moment from "moment";
import {
    Permission,
    SetUserCatalogPermissionDocument,
    UpdateCatalogDocument,
    UpdatePackageDocument
} from "datapm-client-lib";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
    createApiKey,
    createTestPackage,
    createUser,
    getPromptInputs,
    removePackageFiles,
    testCmd,
    writeCSVFile,
    TestResults
} from "./test-utils";

// Prompts
const publishCommandPrompts = ["Target registry?", "Catalog short name?", "Data Access Method?", "Is the above ok?"];

const getPublishCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(publishCommandPrompts, inputs, skip, count);

const updateCommandPrompts: string[] = [];

const getUpdateCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(updateCommandPrompts, inputs, skip, count);

// Sources
const oldHeaders: string[] = [
    "Random integer",
    "Random float",
    "Increasing series integer",
    "Random date times",
    "Increasing series dates",
    "String with 25 fixed values",
    "Lorum ipsum string with varying lengths between 100 and 1,000 characters",
    "Random boolean"
    // "Random value of type boolean, null, string, date, integer, float"
];
let oldRecords: string[][] = [];

const newHeaders: string[] = [
    "Random integer",
    "Changed random float",
    "Changed random dates",
    "String with 25 fixed values",
    "Random boolean",
    "Lorum ipsum string with varying lengths between 100 and 1,000 characters"
];
let newRecords: string[][] = [];

const generateOldRecords = (recordCount: number): string[][] => {
    const data: string[][] = [];

    const randomStartInteger = faker.datatype.number(100);
    const randomStartDate = faker.date.past(10);
    const randomWordList = Array(25)
        .fill("")
        .map(() => faker.name.firstName());

    for (let i = 0; i < recordCount; i += 1) {
        const record: string[] = [];
        const randomWordIndex = Math.floor(randomWordList.length * Math.random());

        record.push(faker.datatype.number(1000).toString());
        record.push((Math.random() * 1000).toString());
        record.push((randomStartInteger + i).toString());
        record.push(faker.date.past(10).toString());
        record.push(moment(randomStartDate).add(i, "days").format("YYYY-MM-DD"));
        record.push(randomWordList[randomWordIndex]);
        record.push(faker.lorem.sentence(20));
        record.push(faker.datatype.boolean().toString());
        // record.push(generateRandomValue());

        data.push(record);
    }

    return data;
};

const generateNewRecords = (recordCount: number): string[][] => {
    const data: string[][] = [];

    const randomWordList = Array(25)
        .fill("")
        .map(() => faker.name.firstName());

    for (let i = 0; i < recordCount; i += 1) {
        const record: string[] = [];
        const randomWordIndex = Math.floor(randomWordList.length * Math.random());

        record.push(faker.datatype.number(1000).toString());
        record.push((Math.random() * 1000).toString());
        record.push(moment(faker.date.past(10)).format("YYYY-MM-DD"));
        record.push(randomWordList[randomWordIndex]);
        record.push(faker.datatype.boolean().toString());
        record.push(faker.lorem.sentence(20));

        data.push(record);
    }

    return data;
};

const generateSourceFile = (filePath: string) => {
    oldRecords = generateOldRecords(150);
    writeCSVFile(filePath, oldHeaders, oldRecords);
};

const updateSourceFile = (filePath: string) => {
    newRecords = generateNewRecords(200);
    writeCSVFile(filePath, newHeaders, newRecords);
};

describe("Update Package Command Tests", async () => {
    const sourceAFilePath = "file://./test.csv";
    let packageAFilePath = "";
    let userAApiKey: string;
    let userBApiKey: string;
    let userAClient: ApolloClient<NormalizedCacheObject>;
    let userBClient: ApolloClient<NormalizedCacheObject>;

    before(async () => {
        resetConfiguration();

        userAClient = await createUser(
            "update-first",
            "update-last",
            "testa-update-command",
            "testA-update@test.datapm.io",
            "testing12345"
        );

        userAApiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey: userAApiKey
        });

        userBClient = await createUser(
            "update-first",
            "update-last",
            "testb-update-command",
            "testB-update@test.datapm.io",
            "testing12345"
        );

        userBApiKey = await createApiKey(userBClient);

        expect(userAApiKey != null).equal(true);
        expect(userBApiKey != null).equal(true);

        generateSourceFile("test.csv");
        await createTestPackage(sourceAFilePath, true);
    });

    after(() => {
        fs.unlinkSync("test.csv");
        removePackageFiles(["test"]);
        removePackageFiles(["package-b"]);
    });

    it("Should overwrite the existing package file", async () => {
        const prompts = getUpdateCommandPromptInputs();
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "update",
            ["test.datapm.json", "--forceUpdate"],
            prompts,
            async (line: string) => {
                if (line.includes("When you are ready, you can publish with the following command")) {
                    results.messageFound = true;
                }
            }
        );

        const newPackageFile: PackageFile = loadPackageFileFromDisk("test.datapm.json");

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
        expect(newPackageFile.displayName).to.be.string("test");
        expect(newPackageFile.packageSlug).to.be.string("test");
        expect(newPackageFile.version).to.be.string("1.0.0");
        expect(newPackageFile.description).to.be.string("Generated from file://./test.csv");
        expect(newPackageFile.schemas[0].sampleRecords?.length).equals(100);
        expect(newPackageFile.schemas[0].recordCount).equals(150);
        expect(newPackageFile.schemas[0].unit).equals(undefined);
        const properties = newPackageFile.schemas[0].properties as Properties;
        expect(properties["Random integer"].unit).equals(undefined);
        expect(properties["Random float"].unit).equals(undefined);
        expect(properties["Increasing series integer"].unit).equals(undefined);
    });

    it("Should update the package file based on the updated source file", async () => {
        updateSourceFile("test.csv");

        const prompts = getUpdateCommandPromptInputs();
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "update",
            ["test.datapm.json", "--forceUpdate"],
            prompts,
            async (line: string) => {
                if (line.includes("When you are ready, you can publish with the following command")) {
                    results.messageFound = true;
                }
            }
        );

        const newPackageFile: PackageFile = loadPackageFileFromDisk("test.datapm.json");

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
        expect(newPackageFile.displayName).be.string("test");
        expect(newPackageFile.packageSlug).be.string("test");
        expect(newPackageFile.version).be.string("2.0.0");
        expect(newPackageFile.description).be.string("Generated from file://./test.csv");
        expect(newPackageFile.website).be.string("");
        expect(newPackageFile.schemas[0].sampleRecords?.length).equals(100);
        expect(newPackageFile.schemas[0].recordCount).equals(200);
        expect(newPackageFile.schemas[0].unit).equals(undefined);
    });

    it("Publish package A", async () => {
        const prompts = getPublishCommandPromptInputs();
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", ["test.datapm.json"], prompts, async (line: string) => {
            if (line.includes("datapm fetch ")) {
                const matches = line.match(/datapm\sfetch\s(.*)/);
                if (matches == null) throw new Error("no match found");
                packageAFilePath = matches[1];
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should not allow updating a package you can't write too", async function () {
        await userAClient.mutate({
            mutation: SetUserCatalogPermissionDocument,
            variables: {
                identifier: {
                    catalogSlug: "testb-update-command"
                },
                value: [
                    {
                        usernameOrEmailAddress: "testB-update-command",
                        permission: [Permission.VIEW],
                        packagePermission: [Permission.VIEW]
                    }
                ],
                message: "test message"
            }
        });

        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey: userBApiKey
        });

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };
        const prompts = getUpdateCommandPromptInputs();

        const cmdResult = await testCmd(
            "update",
            [`http://localhost:${registryServerPort}/testa-update-command/test`],
            prompts,
            async (line: string) => {
                if (line.includes("NOT_AUTHORIZED")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found permission error message").equals(true);

        const makeCatalogPublic = await userAClient.mutate({
            mutation: UpdateCatalogDocument,
            variables: {
                identifier: {
                    catalogSlug: "testa-update-command"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(makeCatalogPublic.errors == null, "no errors").equal(true);

        const makePackagePublic = await userAClient.mutate({
            mutation: UpdatePackageDocument,
            variables: {
                identifier: {
                    catalogSlug: "testa-update-command",
                    packageSlug: "test"
                },
                value: {
                    isPublic: true
                }
            }
        });

        expect(makePackagePublic.errors == null, "no errors").equal(true);

        results.messageFound = false;
        const cmdResult2 = await testCmd(
            "update",
            [`http://localhost:${registryServerPort}/testa-update-command/test`],
            prompts,
            async (line: string) => {
                if (
                    line.includes(
                        "You do not have permission to edit this package. Contact the package manager to request edit permission"
                    )
                ) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult2.code, "Exit code").equals(1);
        expect(results.messageFound, "Found permission error message").equals(true);

        // change back key
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey: userAApiKey
        });
    });

    it("Can't update package A without API key", async () => {
        resetConfiguration();
        addRegistry({
            url: `http://localhost:${registryServerPort}`
        });

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("update", [packageAFilePath, "--defaults"], [], async (line: string) => {
            if (line.includes("You are not logged in to the registry.")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });
});
