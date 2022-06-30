import { expect } from "chai";
import { createTestPackage, loadTestPackageFile, removePackageFiles, TEST_SOURCE_FILES } from "./test-utils";

describe("Compressed File Source Test", function () {
    after(() => {
        removePackageFiles(["state-codes-csv"]);
    });

    it("Create a package file from a gzip compressed file", async function () {
        const packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE7, true);

        const packageFile = loadTestPackageFile(packageAFilePath);

        expect(packageFile.schemas.length === 1).equal(true);
        expect(packageFile.schemas[0].title).equal("state-codes");
        expect(packageFile.schemas[0].recordCount).equal(51);

        expect(packageFile.sources.length === 1).equal(true);
        expect(packageFile.sources[0].streamSets[0].slug).equal("state-codes");
    });

    it("Create a package file from a bzip2 compressed file", async function () {
        const packageAFilePath = await createTestPackage(TEST_SOURCE_FILES.FILE8, true);

        const packageFile = loadTestPackageFile(packageAFilePath);

        expect(packageFile.schemas.length === 1).equal(true);
        expect(packageFile.schemas[0].title).equal("state-codes");
        expect(packageFile.schemas[0].recordCount).equal(51);

        expect(packageFile.sources.length === 1).equal(true);
        expect(packageFile.sources[0].streamSets[0].slug).equal("state-codes");
    });
});
