import { loadPackageFileFromDisk, parsePackageFileJSON, validatePackageFile } from "../src/main";
import { expect } from "chai";
import fs from "fs";

describe("Checking VersionUtil", () => {
    it("Should parse dates", function () {
        const packageFileString = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json");
        const packageFile = parsePackageFileJSON(packageFileString.toString());

        expect(packageFile.updatedDate.getTime()).equals(1601560469442);
    });

    it("Should load readme and license files", function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        expect(packageFile.updatedDate.getTime()).equals(1601560469442);

        expect(packageFile.readmeMarkdown).contains("This is where a readme might go.");
        expect(packageFile.licenseMarkdown).contains("This is not a real license. Just a test.");
    });

    it("Should have v0.3.0 sources array separate from schemas", function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        expect(packageFile.sources.length).equal(1);
        expect(packageFile.sources[0].uris.length).equal(1);
        expect(packageFile.sources[0].uris[0]).equal(
            "https://theunitedstates.io/congress-legislators/legislators-current.csv"
        );
    });

    it("Should throw invalid package file error", function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFile.packageSlug += "-";

        const invalidPackageFileString = JSON.stringify(packageFile);

        let errorFound = false;
        try {
            validatePackageFile(invalidPackageFileString);
        } catch (error) {
            errorFound = true;
        }

        expect(errorFound).equal(true);
    });
});
