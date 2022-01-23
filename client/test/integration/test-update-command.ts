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
} from "../../src/generated/graphql";
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
    TestResults,
    KEYS,
    TEST_SOURCE_FILES
} from "./test-utils";

// Prompts
const publishCommandPrompts = ["Target registry?", "Catalog short name?", "Data Access Method?", "Is the above ok?"];

const getPublishCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(publishCommandPrompts, inputs, skip, count);

const updateCommandPrompts = [
    "Exclude any attributes",
    "Rename attributes",
    "User friendly package name?",
    "Next version?",
    "Short package description?",
    "Website?",
    "Number of sample records?"
];

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
        const prompts = getUpdateCommandPromptInputs([
            "",
            "",
            "updated package 100",
            "",
            "Updated Package 100",
            "https://website100.com",
            "10"
        ]);
        prompts.splice(
            2,
            0,
            {
                message: "What does each test record represent?",
                input: `unit${KEYS.ENTER}`
            },
            {
                message: "Do you want to edit units for the ",
                input: "y" + KEYS.ENTER
            },
            {
                message: "Unit for attribute 'Random integer'?",
                input: `integer${KEYS.ENTER}`
            },
            {
                message: "Unit for attribute 'Random float'?",
                input: `float${KEYS.ENTER}`
            },
            {
                message: "Unit for attribute 'Increasing series integer'?",
                input: `integer serie${KEYS.ENTER}`
            }
        );
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
        expect(newPackageFile.displayName).to.be.string("updated package 100");
        expect(newPackageFile.packageSlug).to.be.string("test");
        expect(newPackageFile.version).to.be.string("1.0.1");
        expect(newPackageFile.description).to.be.string("Updated Package 100");
        expect(newPackageFile.website).to.be.string("https://website100.com");
        expect(newPackageFile.schemas[0].sampleRecords?.length).equals(10);
        expect(newPackageFile.schemas[0].recordCount).equals(150);
        expect(newPackageFile.schemas[0].unit).equals("unit");
        const properties = newPackageFile.schemas[0].properties as Properties;
        expect(properties["Random integer"].unit).equals("integer");
        expect(properties["Random float"].unit).equals("float");
        expect(properties["Increasing series integer"].unit).equals("integer serie");
    });

    it("Should update the package file based on the updated source file", async () => {
        updateSourceFile("test.csv");

        const prompts = getUpdateCommandPromptInputs([
            "",
            "",
            "updated package 200",
            "",
            "Updated Package 200",
            "https://website200.com",
            "10"
        ]);
        prompts.splice(
            2,
            0,
            {
                message: "What does each test record represent?",
                input: KEYS.ENTER
            },
            {
                message: "Do you want to edit units",
                input: `y${KEYS.ENTER}`
            },
            {
                message: "Unit for attribute 'Random integer'?",
                input: KEYS.ENTER
            },
            {
                message: "Unit for attribute 'Changed random float'?",
                input: KEYS.ENTER
            }
        );
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const oldPackageFile: PackageFile = loadPackageFileFromDisk("test.datapm.json");

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
        expect(newPackageFile.displayName).be.string("updated package 200");
        expect(newPackageFile.packageSlug).be.string("test");
        expect(newPackageFile.version).be.string("2.0.0");
        expect(newPackageFile.description).be.string("Updated Package 200");
        expect(newPackageFile.website).be.string("https://website200.com");
        expect(newPackageFile.schemas[0].sampleRecords?.length).equals(10);
        expect(newPackageFile.schemas[0].recordCount).equals(200);
        expect(newPackageFile.schemas[0].unit).equals("unit");
        const properties = newPackageFile.schemas[0].properties as Properties;
        expect(properties["Random integer"].unit).equals("integer");
        expect(properties["Changed random float"].unit).equals(undefined);

        // test presence of added column
        expect(Object.keys(oldPackageFile.schemas[0].properties || {}).indexOf("Changed random float") === -1).equal(
            true
        );
        expect(Object.keys(newPackageFile.schemas[0].properties || {}).indexOf("Changed random float") !== -1).equal(
            true
        );

        // Test removed column
        expect(Object.keys(oldPackageFile.schemas[0].properties || {}).indexOf("Increasing series dates") !== -1).equal(
            true
        );
        expect(Object.keys(newPackageFile.schemas[0].properties || {}).indexOf("Increasing series dates") === -1).equal(
            true
        );
    });

    it("Should confirm if there are more than 10 number type properties", async function () {
        await createTestPackage(TEST_SOURCE_FILES.FILE6, true);

        const prompts = getUpdateCommandPromptInputs([
            "",
            "",
            "updated package 200",
            "",
            "Updated Package 200",
            "https://website200.com",
            "10"
        ]);
        prompts.splice(
            2,
            0,
            {
                message: "What does each us-covid record represent?",
                input: `unit${KEYS.ENTER}`
            },
            {
                message: "Do you want to edit units",
                input: `n${KEYS.ENTER}`
            }
        );
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "update",
            ["us-covid.datapm.json", "--forceUpdate"],
            prompts,
            async (line: string) => {
                if (line.includes("When you are ready, you can publish with the following command")) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
        removePackageFiles(["us-covid"]);
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
        const prompts = getUpdateCommandPromptInputs([
            "",
            "",
            "updated package 101",
            "",
            "Updated Package 101",
            "https://website100.com",
            "10"
        ]);

        prompts.splice(
            2,
            0,
            {
                message: "What does each us-covid record represent?",
                input: `${KEYS.ENTER}`
            },
            {
                message: "Do you want to edit units",
                input: `n${KEYS.ENTER}`
            }
        );

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
            if (line.includes("You are not logged in to the registry. Use the following command to login")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Generate package with excluding and renaming attributes", async function () {
        const generateCommandPrompts = [
            "Is there a header line above?",
            "Header row line number?",
            "How are files updated?",
            "Exclude any attributes",
            "Attributes to exclude?",
            "Rename attributes",
            "Attributes to rename?",
            `New attribute name for "State Name"?`,
            "derived from other 'upstream data'?",
            "What does each state-codes record represent?",
            "User friendly package name?",
            "Package short name?",
            "Starting version?",
            "Short package description?",
            "Website?",
            "Number of sample records?",
            "Publish to registry?"
        ];
        const promptInputs = getPromptInputs(generateCommandPrompts, [
            "",
            "0",
            "",
            "Y",
            `${KEYS.DOWN}${KEYS.DOWN} `,
            "Y",
            `${KEYS.DOWN} `,
            "New State Name",
            "",
            "",
            "Package B",
            "package-b",
            "",
            "This is a short description",
            "https://old-website",
            "10", // number of records
            "no" // publish to registry
        ]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("package", [TEST_SOURCE_FILES.HTTP1], promptInputs, async (line: string) => {
            if (line.includes("When you are ready, you can publish with the following command")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Should honor the excluded and renamed attributes", async () => {
        const prompts = [
            { message: "Exclude any attributes", input: `y${KEYS.ENTER}` },
            { message: "Attributes to exclude?", input: ` ${KEYS.ENTER}` },
            { message: "Rename attributes", input: `y${KEYS.ENTER}` },
            { message: "Attributes to rename?", input: `${KEYS.ENTER}` },
            {
                message: `New attribute name for "New State Name [original: State Name]"?`,
                input: `New State Name 2${KEYS.ENTER}`
            },
            {
                message: `What does each state-codes record represent?`,
                input: `unit2${KEYS.ENTER}`
            },
            {
                message: `User friendly package name?`,
                input: `updated package b${KEYS.ENTER}`
            },
            {
                message: `Next version?`,
                input: `${KEYS.ENTER}`
            },
            {
                message: `Short package description?`,
                input: `Updated Package b${KEYS.ENTER}`
            },
            {
                message: `Website?`,
                input: `https://website-b.com${KEYS.ENTER}`
            },
            {
                message: `Number of sample records?`,
                input: `9${KEYS.ENTER}`
            }
        ];

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "update",
            ["package-b.datapm.json", "--forceUpdate"],
            prompts,
            async (line: string) => {
                if (line.includes("When you are ready, you can publish with the following command")) {
                    results.messageFound = true;
                }
            }
        );

        const newPackageFile: PackageFile = loadPackageFileFromDisk("package-b.datapm.json");

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
        expect(newPackageFile.displayName).to.be.string("updated package b");
        expect(newPackageFile.packageSlug).to.be.string("package-b");
        expect(newPackageFile.version).to.be.string("1.1.0");
        expect(newPackageFile.description).to.be.string("Updated Package b");
        expect(newPackageFile.website).to.be.string("https://website-b.com");
        expect(newPackageFile.schemas[0].sampleRecords?.length).equals(9);
        expect(newPackageFile.schemas[0].unit).equals("unit2");

        const properties = newPackageFile.schemas[0].properties as Properties;

        expect(properties["State Code"].hidden).equal(false);
        expect(properties["State Name"].title).equals("New State Name 2");
        expect(Object.keys(properties).length).equals(2);
    });
});
