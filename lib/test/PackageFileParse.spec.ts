import { loadPackageFileFromDisk, PackageFile, parsePackageFileJSON, validatePackageFile } from "../src/main";
import { expect } from "chai";
import fs from "fs";
import { isDate } from "util/types";

describe("PackageFile checks", () => {
    it("Should have correct schema value", function () {
        const test = new PackageFile();
        expect(test.$schema).equal("https://datapm.io/docs/package-file-schema-v0.32.1.json");
    });

    it("Should parse dates", async function () {
        const packageFileString = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json");
        const packageFile = parsePackageFileJSON(packageFileString.toString());

        expect(packageFile.updatedDate.getTime()).equals(1601560469442);
    });

    it("Should load readme and license files", async function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        expect(packageFile.updatedDate.getTime()).equals(1601560469442);

        expect(packageFile.readmeMarkdown).contains("This is where a readme might go.");
        expect(packageFile.licenseMarkdown).contains("This is not a real license. Just a test.");
    });

    it("Should have v0.3.0 sources array separate from schemas", async function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        expect(packageFile.sources.length).equal(1);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect((packageFile.sources[0].configuration!.uris! as string[]).length).equal(1);
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect((packageFile.sources[0].configuration!.uris! as string[])[0]).equal(
            "https://theunitedstates.io/congress-legislators/legislators-current.csv"
        );
    });

    it("Should have v0.4.0 max and min number values from schemas", async function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        expect(packageFile.schemas.length).equal(1);
        expect(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            Object.values(packageFile.schemas[0].properties!.district.types!).find(
                (a) => typeof a.numberMaxValue === "string"
            )
        ).equal(undefined);

        expect(
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            Object.values(packageFile.schemas[0].properties!.district.types!).find(
                (a) => typeof a.numberMinValue === "string"
            )
        ).equal(undefined);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(packageFile.schemas[0].properties!.district.types!.number?.numberMaxValue === 9);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        expect(packageFile.schemas[0].properties!.district.types!.number?.numberMaxValue === 0);
    });

    it("Should throw invalid package file error", async function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        packageFile.packageSlug += "-";

        let errorFound = false;
        try {
            validatePackageFile(packageFile);
        } catch (error) {
            errorFound = true;
        }

        expect(errorFound).equal(true);
    });

    it("Should have v0.8.0 canonical value true", async function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/congressional-legislators.datapm.json");
        expect(packageFile.canonical).equal(true);
    });
    it("Should parse heirarchical object schema", async function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/object-test.datapm.json");
        expect(
            packageFile.schemas[0].properties?.testObject.types?.object?.objectProperties?.subObject.types.object
                ?.recordCount
        ).equal(1);
    });

    it("Should parse all date values in schema", async function () {
        const packageFile = loadPackageFileFromDisk("test/packageFiles/twitter-sample-1.0.0.datapm.json");

        expect(isDate(packageFile.schemas[0].properties?.author.firstSeen)).equal(true);
    });
});
