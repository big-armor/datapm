import { loadPackageFileFromDisk, PackageFile, parsePackageFileJSON, validatePackageFile } from "../src/main";
import { expect } from "chai";
import fs from "fs";

describe("PackageFile checks", () => {
    it("Should have correct schema value", function () {
        const test = new PackageFile();
        expect(test.$schema).equal("https://datapm.io/docs/package-file-schema-v0.7.0.json");
    });

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
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect((packageFile.sources[0].configuration!.uris! as string[]).length).equal(1);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect((packageFile.sources[0].configuration!.uris! as string[])[0]).equal(
            "https://theunitedstates.io/congress-legislators/legislators-current.csv"
        );
    });

    it("Should have v0.4.0 max and min number values from schemas", function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        expect(packageFile.schemas.length).equal(1);
        expect(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            Object.values(packageFile.schemas[0].properties!.district.valueTypes!).find(
                (a) => typeof a.numberMaxValue === "string"
            )
        ).equal(undefined);

        expect(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            Object.values(packageFile.schemas[0].properties!.district.valueTypes!).find(
                (a) => typeof a.numberMinValue === "string"
            )
        ).equal(undefined);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(packageFile.schemas[0].properties!.district.valueTypes!.number.numberMaxValue === 9);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(packageFile.schemas[0].properties!.district.valueTypes!.number.numberMaxValue === 0);
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
