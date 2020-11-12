import {
    leastCompatible,
    compareSchema,
    Compability,
    DifferenceType,
    compareSchemas,
    diffCompatibility,
    nextVersion,
    validateCatalogSlug,
    validatePackageSlug
} from "../src/PackageUtil";
import { Schema } from "../src/main";
import { SemVer } from "semver";
/// <reference types="jest" />
describe("Checking VersionUtil", () => {
    test("Compatibility ENUM Order", () => {
        expect(leastCompatible(Compability.Identical, Compability.BreakingChange)).toEqual(Compability.BreakingChange);
    });

    test("No change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.Identical);

        expect(oldVersion.version).toEqual("1.0.3");
        expect(newVersion.version).toEqual("1.0.3");
    });

    test("Minor change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.MinorChange);

        expect(oldVersion.version).toEqual("1.0.3");
        expect(newVersion.version).toEqual("1.0.4");
    });

    test("Compatible change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.CompatibleChange);

        expect(oldVersion.version).toEqual("1.0.3");
        expect(newVersion.version).toEqual("1.1.0");
    });

    test("Breaking change test", () => {
        const oldVersion = new SemVer("1.0.3");
        const newVersion = nextVersion(oldVersion, Compability.BreakingChange);

        expect(oldVersion.version).toEqual("1.0.3");
        expect(newVersion.version).toEqual("2.0.0");
    });

    test("Simple property schema comparison", () => {
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

        expect(compareSchema(schemaA1, schemaA2).length).toEqual(0);

        schemaA2.format = "date";

        const changeTitle = compareSchema(schemaA1, schemaA2);

        expect(changeTitle[0].type).toEqual(DifferenceType.CHANGE_PROPERTY_FORMAT);
    });

    test("Type arrays vs singluar values", () => {
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

        expect(diff.length).toEqual(0);

        schemaA1.properties!["string"].type = ["string", "number"];

        const arrayVsNotDiff = compareSchema(schemaA1, schemaA2);

        expect(arrayVsNotDiff.length).toEqual(1);
        expect(arrayVsNotDiff[0].type).toEqual(DifferenceType.CHANGE_PROPERTY_TYPE);

        schemaA2.properties!["string"].type = ["string", "number"];

        const equalDiff = compareSchema(schemaA1, schemaA2);

        expect(equalDiff.length).toEqual(0);
    });

    test("Object schema comparison", () => {
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

        expect(diff.length).toEqual(0);

        schemaA2.properties!["boolean"] = { title: "boolean", type: "boolean" };

        const compatibleChange = compareSchema(schemaA1, schemaA2);

        expect(compatibleChange.length).toEqual(1);

        expect(compatibleChange[0].type).toEqual(DifferenceType.ADD_PROPERTY);

        schemaA1.properties!["date"] = {
            title: "date",
            type: "string",
            format: "date"
        };

        const removePropertyDiff = compareSchema(schemaA1, schemaA2);
        expect(removePropertyDiff.length).toEqual(2);

        const propertyRemoved = removePropertyDiff.find((d) => d.type == DifferenceType.ADD_PROPERTY);

        expect(propertyRemoved != null).toEqual(true);

        schemaA1.properties!["boolean"] = { title: "boolean", type: "boolean" };
        schemaA2.properties!["date"] = {
            title: "date",
            type: "string",
            format: "date"
        };

        const finalDiff = compareSchema(schemaA1, schemaA2);
        expect(finalDiff).toHaveLength(0);
    });

    test("Diff compatibility testing", () => {
        expect(nextVersion(new SemVer("1.0.2"), Compability.BreakingChange)).toEqual(new SemVer("2.0.0"));

        expect(nextVersion(new SemVer("1.0.3"), Compability.CompatibleChange)).toEqual(new SemVer("1.1.0"));

        expect(nextVersion(new SemVer("1.0.3"), Compability.MinorChange)).toEqual(new SemVer("1.0.4"));
    });

    test("Nested Objects Comparison", () => {
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
        expect(firstDiff).toHaveLength(0);

        expect(diffCompatibility(firstDiff)).toEqual(Compability.Identical);

        schemaA2.properties!["object"].properties!["string2"] = { type: "string" };

        const compatibleDiff = compareSchema(schemaA1, schemaA2);

        expect(compatibleDiff).toHaveLength(1);

        expect(compatibleDiff[0].type).toEqual(DifferenceType.ADD_PROPERTY);
        expect(compatibleDiff[0].pointer).toEqual("#/SchemaA/properties/object/properties/string2");

        const compatibleComparison = diffCompatibility(compatibleDiff);

        expect(compatibleComparison).toEqual(Compability.CompatibleChange);

        schemaA1.properties!["object"].properties!["string3"] = { type: "string" };

        const breakingDiff = compareSchema(schemaA1, schemaA2);
        expect(breakingDiff).toHaveLength(2);

        expect(breakingDiff[0].type).toEqual(DifferenceType.REMOVE_PROPERTY);
        expect(breakingDiff[0].pointer).toEqual("#/SchemaA/properties/object");
        expect(breakingDiff[1].type).toEqual(DifferenceType.ADD_PROPERTY);
        expect(breakingDiff[1].pointer).toEqual("#/SchemaA/properties/object/properties/string2");

        const breakingChange = diffCompatibility(breakingDiff);

        expect(breakingChange).toEqual(Compability.BreakingChange);

        schemaA1.properties!["object"].properties!["string2"] = { type: "string" };
        schemaA2.properties!["object"].properties!["string3"] = { type: "string" };

        const finalDiff = compareSchema(schemaA1, schemaA2);

        expect(finalDiff).toHaveLength(0);

        expect(diffCompatibility(finalDiff)).toEqual(Compability.Identical);
    });

    test("Catalog slug validation", () => {
        expect(validateCatalogSlug("a")).toEqual(true);
        expect(validateCatalogSlug("0")).toEqual(true);
        expect(validateCatalogSlug("a-b")).toEqual(true);
        expect(validateCatalogSlug("a-b-123")).toEqual(true);
        expect(validateCatalogSlug("a".repeat(39))).toEqual(true);

        expect(validateCatalogSlug(undefined)).toEqual(false);
        expect(validateCatalogSlug("")).toEqual(false);
        expect(validateCatalogSlug("a_b")).toEqual(false);
        expect(validateCatalogSlug("a--b")).toEqual(false);
        expect(validateCatalogSlug("a-b-")).toEqual(false);
        expect(validateCatalogSlug("-a-b")).toEqual(false);
        expect(validateCatalogSlug("a".repeat(40))).toEqual(false);
    });

    test("Package slug validation", () => {
        expect(validatePackageSlug("a")).toEqual(true);
        expect(validatePackageSlug("0")).toEqual(true);
        expect(validatePackageSlug("a.b")).toEqual(true);
        expect(validatePackageSlug("a--b")).toEqual(true);
        expect(validatePackageSlug("a__b")).toEqual(true);
        expect(validatePackageSlug("a__b----c.123")).toEqual(true);
        expect(validatePackageSlug("a".repeat(100))).toEqual(true);

        expect(validatePackageSlug(undefined)).toEqual(false);
        expect(validatePackageSlug("")).toEqual(false);
        expect(validatePackageSlug(".")).toEqual(false);
        expect(validatePackageSlug("-")).toEqual(false);
        expect(validatePackageSlug("_")).toEqual(false);
        expect(validatePackageSlug("a@b")).toEqual(false);
        expect(validatePackageSlug("a.")).toEqual(false);
        expect(validatePackageSlug("a..b")).toEqual(false);
        expect(validatePackageSlug("a-")).toEqual(false);
        expect(validatePackageSlug("a_")).toEqual(false);
        expect(validatePackageSlug("a___c")).toEqual(false);
    });
});
