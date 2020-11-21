import { loadPackageFileFromDisk, parsePackageFileJSON } from "../src/main";
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
});
