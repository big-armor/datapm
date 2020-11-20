import { parsePackageFileJSON } from "../src/main";
import { expect } from "chai";
import fs from "fs";

describe("Checking VersionUtil", () => {
    it("Should parse dates", function () {
        const packageFileString = fs.readFileSync("test/packageFiles/congressional-legislators.datapm.json");
        const packageFile = parsePackageFileJSON(packageFileString.toString());

        expect(packageFile.updatedDate.getTime()).equals(1601560469442);
    });
});
