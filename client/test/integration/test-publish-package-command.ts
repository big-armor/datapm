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
    removePackageFiles,
    testCmd,
    TestResults,
    TEST_SOURCE_FILES
} from "./test-utils";

const publishCommandPrompts = ["Target registry?", "Catalog short name?"];

const getPublishCommandPromptInputs = (inputs?: string[], skip = 0, count = 20) =>
    getPromptInputs(publishCommandPrompts, inputs, skip, count);

describe("Publish Package Command Tests", async function () {
    let apiKey = "";
    let packageAFilePath = "";

    before(async () => {
        resetConfiguration();
        const userAClient: ApolloClient<NormalizedCacheObject> = await createTestUser();
        apiKey = await createApiKey(userAClient);
        addRegistry({
            url: `http://localhost:${registryServerPort}`
        });

        packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.HTTP1, true);
    });

    after(() => {
        removePackageFiles(["state-codes"]);
        resetConfiguration();
    });

    it("Can't publish non-existing package", async function () {
        const results: TestResults = {
            exitCode: -1,
            messageFound: false
        };

        const cmdResult = await testCmd("publish", ["non-existing.datapm.json"], [], async (line: string) => {
            if (
                line.includes(
                    "is either not a valid package identifier, a valid package url, or url pointing to a valid package file."
                )
            ) {
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
            if (line.includes("You have not added a registry API key.")) {
                results.messageFound = true;
            }
        });

        expect(cmdResult.code, "Exit code").equals(1);
        expect(results.messageFound, "Found error message").equals(true);
    });

    it("Can't publish package without readme file", async function () {
        const packageFile: PackageFile = loadPackageFileFromDisk(packageAFilePath);
        packageFile.readmeFile = "non-existing";
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
        const packageFile: PackageFile = loadPackageFileFromDisk(packageAFilePath);
        packageFile.licenseFile = "non-existing";
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

    it("Publish without readme or license", async function () {
        const packageFile: PackageFile = loadPackageFileFromDisk(packageAFilePath);

        delete packageFile.readmeFile;
        delete packageFile.licenseFile;
        packageFile.version = "2.0.0";
        const newPackageFileLocation = "no-readme-or-license.datapm.json";

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

        fs.unlinkSync(newPackageFileLocation);
    });
});
