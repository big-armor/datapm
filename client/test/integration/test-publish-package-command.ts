import { ApolloClient, NormalizedCacheObject } from "@apollo/client/core";
import { expect } from "chai";
import { loadPackageFileFromDisk, PackageFile } from "datapm-lib";
import fs from "fs";
import { addRegistry, resetConfiguration } from "../../src/util/ConfigUtil";
import { registryServerPort } from "./setup";
import {
    createApiKey,
    createTestPackage,
    createTestUser,
    getPromptInputs,
    KEYS,
    loadTestPackageFile,
    PromptInput,
    removePackageFiles,
    testCmd,
    TestResults,
    TEST_SOURCE_FILES
} from "./test-utils";

const publishCommandPrompts = ["Target registry?", "Catalog short name?", "Data Access Method?", "Is the above ok?"];

const getPublishCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(publishCommandPrompts, inputs, skip, count);

function cleanUp() {
    removePackageFiles(["state-codes"]);
    if (fs.existsSync("package-a-updated.datapm.json")) fs.unlinkSync("package-a-updated.datapm.json");
}

describe("Publish Package Command Tests", async function () {
    let apiKey = "";
    let packageAFilePath = "";

    before(async () => {
        cleanUp();
        resetConfiguration();
        const userAClient: ApolloClient<NormalizedCacheObject> = await createTestUser();
        apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`
        });

        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.HTTP1, true);
    });

    after(() => {
        cleanUp();
        resetConfiguration();
    });

    it("Can't publish non-existing package", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", ["local/non-existing"], [], async (line: string) => {
            if (line.includes("Local package non-existing not found")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't publish package without registries defined with defaults option", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", [packageAFilePath, "--defaults"], [], async (line: string) => {
            if (line.includes("Package file has no registries defined. Can not use --defaults option")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't publish package if there's no registry with api key", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", [packageAFilePath], [], async (line: string) => {
            if (line.includes("You have not logged into a registry from the command line")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't publish package without readme file", async function () {
        const packageFile: PackageFile = loadTestPackageFile(packageAFilePath);
        packageFile.readmeFile = "non-existing";
        delete packageFile.readmeMarkdown;
        const newPackageFileLocation = "missing-readme.datapm.json";

        fs.writeFileSync(newPackageFileLocation, JSON.stringify(packageFile));

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", [newPackageFileLocation, "--defaults"], [], async (line: string) => {
            if (line.includes("README_FILE_NOT_FOUND")) {
                results.messageFound = true;
            }
        });
        fs.unlinkSync(newPackageFileLocation);

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't publish package without missing license file", async function () {
        const packageFile: PackageFile = loadTestPackageFile(packageAFilePath);
        packageFile.licenseFile = "non-existing";
        delete packageFile.licenseMarkdown;
        const newPackageFileLocation = "missing-license.datapm.json";
        fs.writeFileSync(newPackageFileLocation, JSON.stringify(packageFile));

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", [newPackageFileLocation, "--defaults"], [], async (line: string) => {
            if (line.includes("LICENSE_FILE_NOT_FOUND")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);

        fs.unlinkSync(newPackageFileLocation);
    });

    it("Cancel publish while prompting", async function () {
        resetConfiguration();
        addRegistry({
            url: `http://localhost:${registryServerPort}`,
            apiKey
        });

        const prompts = getPublishCommandPromptInputs([KEYS.CANCEL]);
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", [packageAFilePath], prompts, async (line: string) => {
            if (line.includes("User canceled")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Publish package A", async function () {
        const prompts = getPublishCommandPromptInputs();
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "publish",
            [packageAFilePath],
            prompts,
            async (line: string, promptIndex: number) => {
                if (
                    promptIndex === prompts.length &&
                    line.includes("Share the command below to fetch the data in this package")
                ) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Publish package A with defaults option", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", [packageAFilePath, "--defaults"], [], async (line: string) => {
            if (line.includes("Share the command below to fetch the data in this package")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);
    });

    it("Cannot publish without readme or license", async function () {
        const packageFile: PackageFile = loadTestPackageFile(packageAFilePath);

        delete packageFile.readmeFile;
        delete packageFile.readmeMarkdown;
        delete packageFile.licenseFile;
        delete packageFile.licenseMarkdown;
        packageFile.version = "2.0.0";
        const newPackageFileLocation = "no-readme-or-license.datapm.json";

        fs.writeFileSync(newPackageFileLocation, JSON.stringify(packageFile));

        const cmdResult = await testCmd("publish", [newPackageFileLocation, "--defaults"], []);

        expect(cmdResult.code, "Exit code").equals(1);

        fs.unlinkSync(newPackageFileLocation);
    });

    it("Publish package A again, no registry duplication", async function () {
        const prompts: PromptInput[] = [
            {
                message: "Publish to http://localhost",
                input: "No, Choose A Different Registry" + KEYS.ENTER
            },
            {
                message: "Target registry?",
                input: `http://localhost:` + registryServerPort + KEYS.ENTER
            },
            {
                message: "Catalog short name?",
                input: KEYS.ENTER
            },
            {
                message: "Data Access Method?",
                input: KEYS.ENTER
            },
            {
                message: "Is the above ok?",
                input: "Yes" + KEYS.ENTER
            }
        ];
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd(
            "publish",
            [packageAFilePath],
            prompts,
            async (line: string, promptIndex: number) => {
                if (
                    promptIndex === prompts.length &&
                    line.includes("Share the command below to fetch the data in this package")
                ) {
                    results.messageFound = true;
                }
            }
        );

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);

        const packageFile: PackageFile = loadTestPackageFile(packageAFilePath);

        expect(packageFile.registries?.length).equals(1);
    });

    it("Should save the updated package file version after change during publishing", async function () {
        const packageFile: PackageFile = loadTestPackageFile(packageAFilePath);
        const newPackageFileLocation = "package-a-updated.datapm.json";

        packageFile.schemas[0].title = "new-title";

        fs.writeFileSync(newPackageFileLocation, JSON.stringify(packageFile));

        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", [newPackageFileLocation, "--defaults"], [], async (line: string) => {
            if (line.includes("Share the command below to fetch the data in this package")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(0);
        expect(results.messageFound, "Found success message").equals(true);

        const packageFileAfterPublish: PackageFile = loadPackageFileFromDisk(newPackageFileLocation);

        expect(packageFileAfterPublish.version).equals("2.0.0");

        fs.unlinkSync(newPackageFileLocation);
    });
});
