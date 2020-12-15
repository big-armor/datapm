import {
    leastCompatible,
    compareSchema,
    Compability,
    DifferenceType,
    diffCompatibility,
    nextVersion,
    validateCatalogSlug,
    validatePackageSlug,
    comparePackages
} from "../src/PackageUtil";
import { Schema, Properties, PackageFile } from "../src/main";
import { SemVer } from "semver";
import { expect } from "chai";

describe("Checking VersionUtil", () => {
    it("Compatibility ENUM Order", () => {
        expect(leastCompatible(Compability.Identical, Compability.BreakingChange)).equal(Compability.BreakingChange);
    });

    it("No change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.Identical);

        expect(oldVersion.version).equal("1.0.3");
        expect(newVersion.version).equal("1.0.3");
    });

    it("Minor change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.MinorChange);

        expect(oldVersion.version).equal("1.0.3");
        expect(newVersion.version).equal("1.0.4");
    });

    it("Compatible change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.CompatibleChange);

        expect(oldVersion.version).equal("1.0.3");
        expect(newVersion.version).equal("1.1.0");
    });

    it("Breaking change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.BreakingChange);

        expect(oldVersion.version).equal("1.0.3");
        expect(newVersion.version).equal("2.0.0");
    });

    it("Simple property schema comparison", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            type: "string",
            format: "date-time"
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            type: "string",
            format: "date-time"
        };

        expect(compareSchema(schemaA1, schemaA2).length).equal(0);

        schemaA2.format = "date";

        const changeTitle = compareSchema(schemaA1, schemaA2);

        expect(changeTitle[0].type).equal(DifferenceType.CHANGE_PROPERTY_FORMAT);
    });

    it("Type arrays vs singluar values", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            type: "object",
            properties: {
                string: { title: "string", type: "string" },
                number: { title: "number", type: "number" }
            }
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            type: "object",
            properties: {
                string: { title: "string", type: "string" },
                number: { title: "number", type: "number" }
            }
        };

        const diff = compareSchema(schemaA1, schemaA2);

        expect(diff.length).equal(0);

        (schemaA1.properties as Properties).string.type = ["string", "number"];

        const arrayVsNotDiff = compareSchema(schemaA1, schemaA2);

        expect(arrayVsNotDiff.length).equal(1);
        expect(arrayVsNotDiff[0].type).equal(DifferenceType.CHANGE_PROPERTY_TYPE);

        (schemaA2.properties as Properties).string.type = ["string", "number"];

        const equalDiff = compareSchema(schemaA1, schemaA2);

        expect(equalDiff.length).equal(0);
    });

    it("Object schema comparison", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            type: "object",
            properties: {
                string: { title: "string", type: "string" },
                number: { title: "number", type: "number" }
            }
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            type: "object",
            properties: {
                string: { title: "string", type: "string" },
                number: { title: "number", type: "number" }
            }
        };

        const diff = compareSchema(schemaA1, schemaA2);

        expect(diff.length).equal(0);

        (schemaA2.properties as Properties).boolean = { title: "boolean", type: "boolean" };

        const compatibleChange = compareSchema(schemaA1, schemaA2);

        expect(compatibleChange.length).equal(1);

        expect(compatibleChange[0].type).equal(DifferenceType.ADD_PROPERTY);

        (schemaA1.properties as Properties).date = {
            title: "date",
            type: "string",
            format: "date"
        };

        const removePropertyDiff = compareSchema(schemaA1, schemaA2);
        expect(removePropertyDiff.length).equal(2);

        const propertyRemoved = removePropertyDiff.find((d) => d.type === DifferenceType.ADD_PROPERTY);

        expect(propertyRemoved != null).equal(true);

        (schemaA1.properties as Properties).boolean = { title: "boolean", type: "boolean" };
        (schemaA2.properties as Properties).date = {
            title: "date",
            type: "string",
            format: "date"
        };

        const finalDiff = compareSchema(schemaA1, schemaA2);
        expect(finalDiff).length(0);
    });

    it("Diff compatibility testing", () => {
        expect(nextVersion(new SemVer("1.0.2"), Compability.BreakingChange).version).equal(new SemVer("2.0.0").version);

        expect(nextVersion(new SemVer("1.0.3"), Compability.CompatibleChange).version).equal(
            new SemVer("1.1.0").version
        );

        expect(nextVersion(new SemVer("1.0.3"), Compability.MinorChange).version).equal(new SemVer("1.0.4").version);
    });

    it("Nested Objects Comparison", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            type: "object",
            properties: {
                object: {
                    title: "object",
                    type: "object",
                    properties: {
                        string1: { type: "string" }
                    }
                },
                number: { title: "number", type: "number" }
            }
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            type: "object",
            properties: {
                object: {
                    title: "object",
                    type: "object",
                    properties: {
                        string1: { type: "string" }
                    }
                },
                number: { title: "number", type: "number" }
            }
        };

        const firstDiff = compareSchema(schemaA1, schemaA2);
        expect(firstDiff).length(0);

        expect(diffCompatibility(firstDiff)).equal(Compability.Identical);

        ((schemaA2.properties as Properties).object.properties as Properties).string2 = { type: "string" };

        const compatibleDiff = compareSchema(schemaA1, schemaA2);

        expect(compatibleDiff).length(1);

        expect(compatibleDiff[0].type).equal(DifferenceType.ADD_PROPERTY);
        expect(compatibleDiff[0].pointer).equal("#/SchemaA/properties/object/properties/string2");

        const compatibleComparison = diffCompatibility(compatibleDiff);

        expect(compatibleComparison).equal(Compability.CompatibleChange);

        ((schemaA1.properties as Properties).object.properties as Properties).string3 = { type: "string" };

        const breakingDiff = compareSchema(schemaA1, schemaA2);
        expect(breakingDiff).length(2);

        expect(breakingDiff[0].type).equal(DifferenceType.REMOVE_PROPERTY);
        expect(breakingDiff[0].pointer).equal("#/SchemaA/properties/object");
        expect(breakingDiff[1].type).equal(DifferenceType.ADD_PROPERTY);
        expect(breakingDiff[1].pointer).equal("#/SchemaA/properties/object/properties/string2");

        const breakingChange = diffCompatibility(breakingDiff);

        expect(breakingChange).equal(Compability.BreakingChange);

        ((schemaA1.properties as Properties).object.properties as Properties).string2 = { type: "string" };
        ((schemaA2.properties as Properties).object.properties as Properties).string3 = { type: "string" };

        const finalDiff = compareSchema(schemaA1, schemaA2);

        expect(finalDiff).length(0);

        expect(diffCompatibility(finalDiff)).equal(Compability.Identical);
    });

    it("Catalog slug validation", () => {
        expect(validateCatalogSlug("a")).equal(true);
        expect(validateCatalogSlug("0")).equal(true);
        expect(validateCatalogSlug("a-b")).equal(true);
        expect(validateCatalogSlug("a-b-123")).equal(true);
        expect(validateCatalogSlug("a".repeat(39))).equal(true);

        expect(validateCatalogSlug(undefined)).equal(false);
        expect(validateCatalogSlug("")).equal(false);
        expect(validateCatalogSlug("a_b")).equal(false);
        expect(validateCatalogSlug("a--b")).equal(false);
        expect(validateCatalogSlug("a-b-")).equal(false);
        expect(validateCatalogSlug("-a-b")).equal(false);
        expect(validateCatalogSlug("a".repeat(40))).equal(false);
    });

    it("Package slug validation", () => {
        expect(validatePackageSlug("a")).equal(true);
        expect(validatePackageSlug("0")).equal(true);
        expect(validatePackageSlug("a.b")).equal(true);
        expect(validatePackageSlug("a--b")).equal(true);
        expect(validatePackageSlug("a__b")).equal(true);
        expect(validatePackageSlug("a__b----c.123")).equal(true);
        expect(validatePackageSlug("a".repeat(100))).equal(true);

        expect(validatePackageSlug(undefined)).equal(false);
        expect(validatePackageSlug("")).equal(false);
        expect(validatePackageSlug(".")).equal(false);
        expect(validatePackageSlug("-")).equal(false);
        expect(validatePackageSlug("_")).equal(false);
        expect(validatePackageSlug("a@b")).equal(false);
        expect(validatePackageSlug("a.")).equal(false);
        expect(validatePackageSlug("a..b")).equal(false);
        expect(validatePackageSlug("a-")).equal(false);
        expect(validatePackageSlug("a_")).equal(false);
        expect(validatePackageSlug("a___c")).equal(false);
    });

    it("Compare identical", () => {
        const schemaA1: Schema = {
            title: "SchemaA",
            type: "string",
            format: "date-time",
            source: {
                type: "test",
                uri: "http://datapm.io/test",
                configuration: {}
            }
        };

        const schemaA2: Schema = {
            title: "SchemaA",
            type: "string",
            format: "date-time",
            source: {
                type: "test",
                uri: "http://datapm.io/test",
                configuration: {}
            }
        };

        expect(compareSchema(schemaA1, schemaA2).length).equal(0);

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        schemaA2.source!.uri = "https://somethingelse.datapm.io";

        expect(compareSchema(schemaA1, schemaA2).length).equal(1);
    });

    it("Package File updated dates", function () {
        const packageFileA: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test"
        };

        const packageFileB: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test"
        };

        expect(comparePackages(packageFileA, packageFileB).some((d) => d.type === "CHANGE_UPDATED_DATE")).equal(false);

        packageFileB.updatedDate = new Date(new Date().getTime() - 100);

        const diff = comparePackages(packageFileA, packageFileB);

        expect(diff.some((d) => d.type === "CHANGE_UPDATED_DATE")).equal(true);
    });

    it("Package File updated versions", function () {
        const packageFileA: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test"
        };

        const packageFileB: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test"
        };

        expect(comparePackages(packageFileA, packageFileB).some((d) => d.type === "CHANGE_VERSION")).equal(false);

        packageFileB.version = "1.0.1";

        const diff = comparePackages(packageFileA, packageFileB);

        expect(diff.some((d) => d.type === "CHANGE_VERSION")).equal(true);
    });

    it("Package File updated readme", function () {
        const packageFileA: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test",
            readmeMarkdown: "Some readme content"
        };

        const packageFileB: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test",
            readmeMarkdown: packageFileA.readmeMarkdown
        };

        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_README_MARKDOWN)
        ).equal(false);

        packageFileB.readmeFile = "some-new-file.README.md";
        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_README_FILE)
        ).equal(true);

        packageFileB.readmeMarkdown = "other content";

        const diff = comparePackages(packageFileA, packageFileB);

        expect(diff.some((d) => d.type === DifferenceType.CHANGE_README_MARKDOWN)).equal(true);
    });

    it("Package File updated license", function () {
        const packageFileA: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test",
            licenseMarkdown: "Some content"
        };

        const packageFileB: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test",
            licenseMarkdown: packageFileA.licenseMarkdown
        };

        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_LICENSE_MARKDOWN)
        ).equal(false);

        packageFileB.licenseFile = "some-new-file.LICENSE.md";
        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_LICENSE_FILE)
        ).equal(true);

        packageFileB.licenseMarkdown = "other content";

        const diff = comparePackages(packageFileA, packageFileB);

        expect(diff.some((d) => d.type === DifferenceType.CHANGE_LICENSE_MARKDOWN)).equal(true);
    });

    it("Package File updated contact email", function () {
        const packageFileA: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test",
            readmeMarkdown: "Some readme content",
            contactEmail: "test@test.com"
        };

        const packageFileB: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test",
            readmeMarkdown: packageFileA.readmeMarkdown,
            contactEmail: packageFileA.contactEmail
        };

        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_CONTACT_EMAIL)
        ).equal(false);

        packageFileB.contactEmail = "testb@test.com";
        expect(
            comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_CONTACT_EMAIL)
        ).equal(true);
    });

    it("Package File updated website", function () {
        const packageFileA: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: new Date(),
            description: "Back test",
            readmeMarkdown: "Some readme content",
            contactEmail: "test@test.com",
            website: "https://dreamingwell.com"
        };

        const packageFileB: PackageFile = {
            packageSlug: "test",
            displayName: "test",
            generatedBy: "test",
            schemas: [],
            version: "1.0.0",
            updatedDate: packageFileA.updatedDate,
            description: "Back test",
            readmeMarkdown: packageFileA.readmeMarkdown,
            contactEmail: packageFileA.contactEmail,
            website: packageFileA.website
        };

        expect(comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_WEBSITE)).equal(
            false
        );

        packageFileB.website = "https://datapm.io";
        expect(comparePackages(packageFileA, packageFileB).some((d) => d.type === DifferenceType.CHANGE_WEBSITE)).equal(
            true
        );
    });
});
