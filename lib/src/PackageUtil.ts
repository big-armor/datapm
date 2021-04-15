import { SemVer } from "semver";
import { Schema, PackageFile, CountPrecision, PackageFileV010, PackageFileV030 } from "./main";
import fs from "fs";
import path from "path";
import AJV from "ajv";
import fetch from "cross-fetch";
import { Source, StreamSet, ValueTypes, ValueTypeStatistics } from "./PackageFile-v0.4.0";
import { PackageFileV020 } from "./PackageFile-v0.2.0";

import deepEqual from "fast-deep-equal";

export type DPMRecordValue =
    | number
    | string
    | boolean
    | Date
    | bigint
    | { [key: string]: unknown }
    | Array<DPMRecordValue>
    | null;
export type DPMRecord = Record<string, DPMRecordValue>;
export type DPMConfiguration = Record<string, number | string | boolean | { [key: string]: unknown } | null>;

export enum Compability {
    Identical = 0,
    MinorChange = 1,
    CompatibleChange = 2,
    BreakingChange = 3
}

export enum DifferenceType {
    REMOVE_SCHEMA = "REMOVE_SCHEMA",
    REMOVE_HIDDEN_SCHEMA = "REMOVE_HIDDEN_SCHEMA",
    ADD_SCHEMA = "ADD_SCHEMA",
    REMOVE_SOURCE = "REMOVE_SOURCE",
    CHANGE_PACKAGE_DISPLAY_NAME = "CHANGE_PACKAGE_DISPLAY_NAME",
    CHANGE_PACKAGE_DESCRIPTION = "CHANGE_PACKAGE_DESCRIPTION",
    CHANGE_SOURCE = "CHANGE_SOURCE",
    CHANGE_SOURCE_CONFIGURATION = "CHANGE_SOURCE_CONFIGURATION",
    CHANGE_SOURCE_URIS = "CHANGE_SOURCE_URIS",
    CHANGE_STREAM_STATS = "CHANGE_SOURCE_STATS",
    CHANGE_STREAM_UPDATE_HASH = "CHANGE_SOURCE_UPDATE_HASH",
    ADD_PROPERTY = "ADD_PROPERTY",
    HIDE_PROPERTY = "HIDE_PROPERTY",
    UNHIDE_PROPERTY = "UNHIDE_PROPERTY",
    REMOVE_PROPERTY = "REMOVE_PROPERTY",
    REMOVE_HIDDEN_PROPERTY = "REMOVE_HIDDEN_PROPERTY",
    CHANGE_PROPERTY_TYPE = "CHANGE_PROPERTY_TYPE",
    CHANGE_PROPERTY_FORMAT = "CHANGE_PROPERTY_FORMAT",
    CHANGE_PROPERTY_UNIT = "CHANGE_PROPERTY_UNIT",
    CHANGE_PROPERTY_DESCRIPTION = "CHANGE_PROPERTY_DESCRIPTION",
    CHANGE_GENERATED_BY = "CHANGE_GENERATED_BY",
    CHANGE_UPDATED_DATE = "CHANGE_UPDATED_DATE",
    CHANGE_VERSION = "CHANGE_VERSION",
    CHANGE_README_MARKDOWN = "CHANGE_README_MARKDOWN",
    CHANGE_LICENSE_MARKDOWN = "CHANGE_LICENSE_MARKDOWN",
    CHANGE_README_FILE = "CHANGE_README_FILE",
    CHANGE_LICENSE_FILE = "CHANGE_LICENSE_FILE",
    CHANGE_WEBSITE = "CHANGE_WEBSITE",
    CHANGE_CONTACT_EMAIL = "CHANGE_CONTACT_EMAIL",
    REMOVE_STREAM_SET = "REMOVE_STREAM_SET"
}
export interface Difference {
    type: DifferenceType;
    pointer: string;
}

export interface Comparison {
    compatibility: Compability;
    differences: Difference[];
}

export function leastCompatible(a: Compability, b: Compability): Compability {
    if (a === b) return a;

    if (a < b) return b;

    return a;
}

/** Compare to provided package files, and find the Difference values between the objects
 */
export function comparePackages(packageA: PackageFile, packageB: PackageFile): Difference[] {
    let response: Difference[] = [];

    if (packageA.description !== packageB.description)
        response.push({
            type: DifferenceType.CHANGE_PACKAGE_DESCRIPTION,
            pointer: "#"
        });

    if (packageA.displayName !== packageB.displayName)
        response.push({
            type: DifferenceType.CHANGE_PACKAGE_DISPLAY_NAME,
            pointer: "#"
        });

    if (packageA.version !== packageB.version) {
        response.push({
            type: DifferenceType.CHANGE_VERSION,
            pointer: "#"
        });
    }

    if (packageA.readmeFile !== packageB.readmeFile) {
        response.push({
            type: DifferenceType.CHANGE_README_FILE,
            pointer: "#"
        });
    }

    if (packageA.website !== packageB.website) {
        response.push({
            type: DifferenceType.CHANGE_WEBSITE,
            pointer: "#"
        });
    }

    if (packageA.contactEmail !== packageB.contactEmail) {
        response.push({
            type: DifferenceType.CHANGE_CONTACT_EMAIL,
            pointer: "#"
        });
    }

    if (packageA.readmeMarkdown !== packageB.readmeMarkdown) {
        response.push({
            type: DifferenceType.CHANGE_README_MARKDOWN,
            pointer: "#"
        });
    }

    if (packageA.licenseFile !== packageB.licenseFile) {
        response.push({
            type: DifferenceType.CHANGE_LICENSE_FILE,
            pointer: "#"
        });
    }

    if (packageA.licenseMarkdown !== packageB.licenseMarkdown) {
        response.push({
            type: DifferenceType.CHANGE_LICENSE_MARKDOWN,
            pointer: "#"
        });
    }

    if (packageA.generatedBy !== packageB.generatedBy)
        response.push({ type: DifferenceType.CHANGE_GENERATED_BY, pointer: "#" });

    if (packageA.updatedDate.getTime() !== packageB.updatedDate.getTime())
        response.push({ type: DifferenceType.CHANGE_UPDATED_DATE, pointer: "#" });

    response = response.concat(compareSchemas(packageA.schemas, packageB.schemas));

    response = response.concat(compareSources(packageA.sources, packageB.sources));

    return response;
}

/** Given two sets of schemas, compares forward compatibility only */
export function compareSchemas(priorSchemas: Schema[], newSchemas: Schema[]): Difference[] {
    let response: Difference[] = [];
    for (const schemaA of priorSchemas) {
        let found = false;

        for (const schemaB of newSchemas) {
            if (schemaA.title !== schemaB.title) continue;

            found = true;

            // Math.min not a typo - looking for "most compatibile schema comparison",
            // because we're not defining which prior and new schema must be compared
            response = response.concat(compareSchema(schemaA, schemaB, "#"));
        }

        if (!found) {
            if (schemaA.hidden === true) {
                response.push({
                    type: DifferenceType.REMOVE_HIDDEN_SCHEMA,
                    pointer: ""
                });
            } else {
                response.push({
                    type: DifferenceType.REMOVE_SCHEMA,
                    pointer: ""
                });
            }
        }
    }

    return response;
}

/** Given two sets of schemas, compares forward compatibility only */
export function compareSources(priorSources: Source[], newSources: Source[]): Difference[] {
    let response: Difference[] = [];
    for (const sourceA of priorSources) {
        let found = false;

        for (const sourceB of newSources) {
            if (sourceA.slug !== sourceB.slug) continue;

            found = true;

            // Math.min not a typo - looking for "most compatibile schema comparison",
            // because we're not defining which prior and new schema must be compared
            response = response.concat(compareSource(sourceA, sourceB, "#"));
        }

        if (!found)
            response.push({
                type: DifferenceType.REMOVE_SOURCE,
                pointer: ""
            });
    }

    return response;
}

export function compareStream(priorStreamSet: StreamSet, newStreamSet: StreamSet, pointer = "#"): Difference[] {
    const response: Difference[] = [];

    if (priorStreamSet.streamStats.inspectedCount !== newStreamSet.streamStats.inspectedCount) {
        response.push({ type: DifferenceType.CHANGE_STREAM_STATS, pointer });
    } else if (priorStreamSet.streamStats.inspectedCount !== newStreamSet.streamStats.inspectedCount) {
        response.push({ type: DifferenceType.CHANGE_STREAM_STATS, pointer });
    } else if (priorStreamSet.streamStats.inspectedCount !== newStreamSet.streamStats.inspectedCount) {
        response.push({ type: DifferenceType.CHANGE_STREAM_STATS, pointer });
    } else if (priorStreamSet.streamStats.inspectedCount !== newStreamSet.streamStats.inspectedCount) {
        response.push({ type: DifferenceType.CHANGE_STREAM_STATS, pointer });
    }

    if (priorStreamSet.lastUpdateHash !== newStreamSet.lastUpdateHash && priorStreamSet.lastUpdateHash != null) {
        response.push({ type: DifferenceType.CHANGE_STREAM_UPDATE_HASH, pointer: pointer });
    }

    return response;
}

export function compareSource(priorSource: Source, newSource: Source, pointer = "#"): Difference[] {
    let response: Difference[] = [];

    if (!sourceURIsEquivalent(priorSource.uris, newSource.uris)) {
        response.push({ type: DifferenceType.CHANGE_SOURCE_URIS, pointer });
    }

    if (priorSource == null && newSource != null) {
        response.push({ type: DifferenceType.CHANGE_SOURCE, pointer: pointer });
    } else if (newSource == null && priorSource != null) {
        response.push({ type: DifferenceType.CHANGE_SOURCE, pointer: pointer });
    } else if (priorSource != null && newSource != null) {
        if (priorSource.type !== newSource.type) {
            response.push({ type: DifferenceType.CHANGE_SOURCE, pointer: pointer });
        } else if (!sourceURIsEquivalent(priorSource.uris, newSource.uris)) {
            response.push({ type: DifferenceType.CHANGE_SOURCE, pointer: pointer });
        } else {
            const configComparison = compareConfigObjects(priorSource.configuration, newSource.configuration);

            if (!configComparison)
                response.push({ type: DifferenceType.CHANGE_SOURCE_CONFIGURATION, pointer: pointer });
        }
    }

    for (const priorStreamSet of priorSource.streamSets) {
        const newStreamSet = newSource.streamSets.find((ssB) => ssB.slug === priorStreamSet.slug);

        if (!newStreamSet) {
            response.push({ type: DifferenceType.REMOVE_STREAM_SET, pointer });
            continue;
        }

        response = response.concat(compareStream(priorStreamSet, newStreamSet, pointer));
    }

    return response;
}

/** Compare two individual schemas, returning the least
 * compatiblility of their features.
 */
export function compareSchema(priorSchema: Schema, newSchema: Schema, pointer = "#"): Difference[] {
    let response: Difference[] = [];

    // Do not consider title comparison - assumes intent to compare
    // priorSchema.title!==newSchema.title

    pointer += "/" + newSchema.title;

    if (priorSchema.description !== newSchema.description)
        response.push({
            type: DifferenceType.CHANGE_PROPERTY_DESCRIPTION,
            pointer
        });

    if (Array.isArray(priorSchema.type) && Array.isArray(newSchema.type)) {
        if (!priorSchema.type.every((v) => newSchema.type?.indexOf(v) !== -1))
            response.push({ type: DifferenceType.CHANGE_PROPERTY_TYPE, pointer });
    } else if (!Array.isArray(priorSchema.type) && !Array.isArray(newSchema.type)) {
        if (priorSchema.type !== newSchema.type) response.push({ type: DifferenceType.CHANGE_PROPERTY_TYPE, pointer });
    } else {
        response.push({ type: DifferenceType.CHANGE_PROPERTY_TYPE, pointer });
    }

    if (priorSchema.hidden !== true && newSchema.hidden === true) {
        response.push({ type: DifferenceType.HIDE_PROPERTY, pointer });
    } else if (priorSchema.hidden === true && newSchema.hidden !== true) {
        response.push({ type: DifferenceType.UNHIDE_PROPERTY, pointer });
    }

    if (priorSchema.type === "string" && priorSchema.format !== newSchema.format)
        response.push({ type: DifferenceType.CHANGE_PROPERTY_FORMAT, pointer });

    if (priorSchema.unit !== newSchema.unit) response.push({ type: DifferenceType.CHANGE_PROPERTY_UNIT, pointer });

    if (priorSchema.type === "object") {
        if (priorSchema.properties == null)
            throw new Error("Prior Schema property type is object, but has no properties");

        if (newSchema.properties == null) throw new Error("New Schema property type is object, but has no properties");

        // forward comparison of properties
        for (const priorKey of Object.keys(priorSchema.properties)) {
            const propertyPointer = pointer + "/properties";
            const newKeys = Object.keys(newSchema.properties);

            if (newKeys.indexOf(priorKey) === -1) {
                if (priorSchema.properties[priorKey].hidden) {
                    response.push({
                        type: DifferenceType.REMOVE_HIDDEN_PROPERTY,
                        pointer
                    });
                } else {
                    response.push({
                        type: DifferenceType.REMOVE_PROPERTY,
                        pointer: pointer
                    });
                }
                break;
            }

            const priorProperty = priorSchema.properties[priorKey];

            const newProperty = newSchema.properties[priorKey];

            response = response.concat(compareSchema(priorProperty, newProperty, propertyPointer));
        }

        // Compare in reverse, as a compatible change
        for (const newKey of Object.keys(newSchema.properties)) {
            const priorKeys = Object.keys(priorSchema.properties);
            const propertyPointer = pointer + "/properties/" + newKey;

            if (priorKeys.indexOf(newKey) === -1) {
                response.push({
                    type: DifferenceType.ADD_PROPERTY,
                    pointer: propertyPointer
                });
            }
        }
    }

    return response;
}
/** returns false if they are different */
export function sourceURIsEquivalent(urisA: string[], urisB: string[]): boolean {
    for (const a of urisA) {
        if (!urisB.includes(a)) return false;
    }

    for (const b of urisB) {
        if (!urisA.includes(b)) return false;
    }

    return true;
}

/** Retuns whether the two objects are identical or not */
export function compareConfigObjects(
    priorObject?: DPMConfiguration | null,
    newObject?: DPMConfiguration | null
): boolean {
    if (priorObject == null && newObject == null) return true;

    if ((priorObject == null && newObject != null) || (priorObject != null && newObject == null)) return false;

    return deepEqual(priorObject, newObject);
}

/** Given a set of differences from a schema comparison, return the compatibility */
export function diffCompatibility(diffs: Difference[]): Compability {
    let returnValue = Compability.Identical;

    diffs.forEach((d) => {
        switch (d.type) {
            case DifferenceType.REMOVE_PROPERTY:
            case DifferenceType.REMOVE_SCHEMA:
            case DifferenceType.CHANGE_PROPERTY_FORMAT:
            case DifferenceType.CHANGE_PROPERTY_TYPE:
            case DifferenceType.HIDE_PROPERTY:
                returnValue = Compability.BreakingChange;
                break;

            case DifferenceType.ADD_PROPERTY:
            case DifferenceType.ADD_SCHEMA:
            case DifferenceType.UNHIDE_PROPERTY:
                returnValue = Math.max(returnValue, Compability.CompatibleChange);
                break;

            case DifferenceType.CHANGE_PACKAGE_DESCRIPTION:
            case DifferenceType.CHANGE_PACKAGE_DISPLAY_NAME:
            case DifferenceType.CHANGE_PROPERTY_DESCRIPTION:
            case DifferenceType.CHANGE_SOURCE:
            case DifferenceType.CHANGE_SOURCE_CONFIGURATION:
            case DifferenceType.CHANGE_README_MARKDOWN:
            case DifferenceType.CHANGE_LICENSE_MARKDOWN:
            case DifferenceType.CHANGE_WEBSITE:
            case DifferenceType.CHANGE_CONTACT_EMAIL:
            case DifferenceType.REMOVE_HIDDEN_PROPERTY:
            case DifferenceType.REMOVE_HIDDEN_SCHEMA:
            case DifferenceType.CHANGE_VERSION: // this just requires that the number be at least one minor version greater, it doesn't return the actual difference
            case DifferenceType.REMOVE_SOURCE:
            case DifferenceType.REMOVE_STREAM_SET:
            case DifferenceType.CHANGE_PROPERTY_UNIT:
                returnValue = Math.max(returnValue, Compability.MinorChange);
                break;

            case DifferenceType.CHANGE_STREAM_UPDATE_HASH:
            case DifferenceType.CHANGE_STREAM_STATS:
            case DifferenceType.CHANGE_GENERATED_BY:
            case DifferenceType.CHANGE_UPDATED_DATE:
            case DifferenceType.CHANGE_README_FILE:
            case DifferenceType.CHANGE_LICENSE_FILE:
                // nothing to do
                break;

            default:
                throw new Error("Diff type " + d.type + " not mapped");
        }
    });

    return returnValue;
}

export function nextVersion(currentVersion: SemVer, diffCompatibility: Compability): SemVer {
    const copy = new SemVer(currentVersion.version);

    switch (diffCompatibility) {
        case Compability.BreakingChange:
            return copy.inc("major");

        case Compability.CompatibleChange:
            return copy.inc("minor");

        case Compability.MinorChange:
            return copy.inc("patch");

        case Compability.Identical:
            return copy;

        default:
            throw new Error("Unrecognized compability " + diffCompatibility);
    }
}

export function compatibilityToString(compatibility: Compability): string {
    switch (compatibility) {
        case Compability.BreakingChange:
            return "breaking";
        case Compability.CompatibleChange:
            return "compatibile";
        case Compability.MinorChange:
            return "minor";
        case Compability.Identical:
            return "no";
        default:
            throw new Error("Compatibility " + compatibility + " not recognized");
    }
}

export function loadPackageFileFromDisk(packageFilePath: string): PackageFile {
    if (!fs.existsSync(packageFilePath)) throw new Error("FILE_NOT_FOUND");

    let packageFileAbsolutePath;
    if (path.isAbsolute(packageFilePath)) {
        packageFileAbsolutePath = path.dirname(packageFilePath);
    } else {
        packageFileAbsolutePath = process.cwd() + path.sep + path.dirname(packageFilePath);
    }

    let packageFile;

    const packageFileContents = fs.readFileSync(packageFilePath).toString();

    validatePackageFile(packageFileContents);

    try {
        packageFile = parsePackageFileJSON(packageFileContents);
    } catch (error) {
        throw new Error("PACKAGE_PARSE_ERROR: " + error.message);
    }

    if (packageFile.readmeFile != null) {
        const readmeFileAbsolutePath = packageFileAbsolutePath + path.sep + packageFile.readmeFile;

        if (!fs.existsSync(readmeFileAbsolutePath)) {
            throw new Error("README_FILE_NOT_FOUND: " + readmeFileAbsolutePath);
        }

        packageFile.readmeMarkdown = fs.readFileSync(readmeFileAbsolutePath).toString();
    }

    if (packageFile.licenseFile != null) {
        const licenseFileAbsolutePath = packageFileAbsolutePath + path.sep + packageFile.licenseFile;

        if (!fs.existsSync(licenseFileAbsolutePath)) {
            throw new Error("LICENSE_FILE_NOT_FOUND: " + licenseFileAbsolutePath);
        }

        packageFile.licenseMarkdown = fs.readFileSync(licenseFileAbsolutePath).toString();
    }

    return packageFile;
}

export function parsePackageFileJSON(packageFileString: string): PackageFile {
    try {
        let packageFile = JSON.parse(packageFileString, (key, value) => {
            if (key !== "updatedDate" && key !== "createdAt" && key !== "updatedAt") return value;

            return new Date(Date.parse(value));
        });

        packageFile = upgradePackageFile(packageFile);

        return packageFile;
    } catch (error) {
        throw new Error("ERROR_PARSING_PACKAGE_FILE - " + error.message);
    }
}

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function upgradePackageFile(packageFileObject: any): PackageFile {
    if (packageFileObject.$schema == null) {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.2.0.json";

        const oldPackageFile = packageFileObject as PackageFileV010;

        for (const schema of oldPackageFile.schemas) {
            (schema as Schema).recordsInspectedCount = schema.recordCount;
            (schema as Schema).recordCountPrecision =
                schema.recordCountApproximate === true ? CountPrecision.APPROXIMATE : CountPrecision.EXACT;
            delete schema.recordCountApproximate;
        }
    }

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.2.0.json") {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.3.0.json";

        const oldPackageFile = packageFileObject as PackageFileV020;
        const newPackagefile = packageFileObject as PackageFile;

        for (const schema of oldPackageFile.schemas) {
            if (schema && schema.source) {
                newPackagefile.sources = [
                    {
                        slug: schema.source?.uri,
                        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                        type: schema.source?.type,
                        uris: [schema.source?.uri],
                        configuration: schema.source?.configuration,
                        streamSets: [
                            {
                                slug: schema.source?.uri,
                                configuration: {},
                                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                                schemaTitles: [schema.title!],
                                lastUpdateHash: schema.source?.lastUpdateHash,
                                streamStats: {
                                    inspectedCount: schema.recordsInspectedCount || 0,
                                    byteCount: schema.byteCount,
                                    byteCountPrecision: (schema.byteCountPrecision as unknown) as CountPrecision,
                                    recordCount: schema.recordCount,
                                    recordCountPrecision: (schema.recordCountPrecision as unknown) as CountPrecision
                                }
                            }
                        ]
                    }
                ];
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete schema.source;
            }
        }
    }

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.3.0.json") {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.4.0.json";

        const oldPackageFile = packageFileObject as PackageFileV030;

        for (const oldSchema of oldPackageFile.schemas) {
            for (const propertyName in oldSchema.properties) {
                const property = oldSchema.properties[propertyName];
                for (const oldValueTypeName in property.valueTypes) {
                    const oldValueType = property.valueTypes[oldValueTypeName];

                    if (typeof oldValueType.numberMaxValue === "string") {
                        const oldValueTypeString = oldValueType.numberMaxValue as string;
                        const newValueTypeStatistic = (property.valueTypes[
                            oldValueTypeName
                        ] as unknown) as ValueTypeStatistics;

                        try {
                            if (oldValueTypeString.indexOf(".") !== -1) {
                                newValueTypeStatistic.numberMaxValue = Number.parseFloat(oldValueTypeString);
                            } else {
                                newValueTypeStatistic.numberMaxValue = Number.parseInt(oldValueTypeString);
                            }
                        } catch (error) {
                            delete newValueTypeStatistic.numberMaxValue;
                        }
                    }

                    if (typeof oldValueType.numberMinValue === "string") {
                        const oldValueTypeString = oldValueType.numberMinValue as string;
                        const newValueTypeStatistic = (property.valueTypes[
                            oldValueTypeName
                        ] as unknown) as ValueTypeStatistics;

                        try {
                            if (oldValueTypeString.indexOf(".") !== -1) {
                                newValueTypeStatistic.numberMinValue = Number.parseFloat(oldValueTypeString);
                            } else {
                                newValueTypeStatistic.numberMinValue = Number.parseInt(oldValueTypeString);
                            }
                        } catch (error) {
                            delete newValueTypeStatistic.numberMinValue;
                        }
                    }
                }
            }
        }
    }

    return packageFileObject as PackageFile;
}

export async function validatePackageFileInBrowser(packageFile: string): Promise<void> {
    const ajv = new AJV({
        format: false // https://www.npmjs.com/package/ajv#redos-attack
    });

    let packageSchemaFile: string;

    let packageFileObject;
    try {
        packageFileObject = JSON.parse(packageFile);
    } catch (error) {
        throw new Error("ERROR_PARSING_PACKAGE_FILE - " + error.message);
    }

    const schemaVersion = getSchemaVersionFromPackageFile(packageFileObject);

    const response = await fetch("/docs/datapm-package-file-schema-v" + schemaVersion + ".json");

    if (response.status > 199 && response.status < 300) {
        packageSchemaFile = await response.text();
    } else {
        throw new Error("ERROR_FINDING_PACKAGE_SCHEMA_FILE " + response.status);
    }

    let schemaObject;
    try {
        schemaObject = JSON.parse(packageSchemaFile);
    } catch (error) {
        throw new Error("ERROR_PARSING_PACKAGE_SCHEMA_FILE: " + error.message);
    }

    if (!ajv.validateSchema(schemaObject)) {
        throw new Error("ERROR_READING_SCHEMA");
    }

    const ajvResponse = ajv.validate(schemaObject, packageFileObject);

    if (!ajvResponse) {
        throw new Error("INVALID_PACKAGE_FILE_SCHEMA: " + JSON.stringify(ajv.errors));
    }
}

/** Given a raw package file JSON object, return the version of the package file schema from the $schema value. This handles
 * legacy values.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function getSchemaVersionFromPackageFile(packageFileObject: any): string {
    let packageFileSchemaUrl = packageFileObject.$schema as string;

    if (packageFileSchemaUrl == null)
        packageFileSchemaUrl = "https://datapm.io/docs/datapm-package-file-schema-v0.1.0.json";

    const schemaVersion = packageFileSchemaUrl.match(/package-file-schema-v(.*)\.json/i);

    if (schemaVersion == null) throw new Error("ERROR_SCHEMA_VERSION_NOT_RECOGNIZED - " + packageFileSchemaUrl);

    return schemaVersion[1];
}

export function validatePackageFile(packageFile: string): void {
    let packageFileObject;

    try {
        packageFileObject = JSON.parse(packageFile);
    } catch (error) {
        throw new Error("ERROR_PARSING_PACKAGE_FILE - " + error.message);
    }

    const ajv = new AJV({
        format: false // https://www.npmjs.com/package/ajv#redos-attack
    });

    let packageSchemaFile: string;

    const schemaVersion = getSchemaVersionFromPackageFile(packageFileObject);

    try {
        const pathToDataPmLib = require.resolve("datapm-lib").replace(path.sep + "src" + path.sep + "main.js", "");
        packageSchemaFile = fs.readFileSync(
            path.join(pathToDataPmLib, "packageFileSchema-v" + schemaVersion + ".json"),
            "utf8"
        );
    } catch (error) {
        try {
            packageSchemaFile = fs.readFileSync(
                "node_modules" + path.sep + "datapm-lib" + path.sep + "packageFileSchema-v" + schemaVersion + ".json",
                "utf8"
            );
        } catch (error) {
            try {
                packageSchemaFile = fs.readFileSync("packageFileSchema-v" + schemaVersion + ".json", "utf8");
            } catch (error) {
                packageSchemaFile = fs.readFileSync(
                    path.join("..", "lib", "packageFileSchema-v" + schemaVersion + ".json"),
                    "utf8"
                );
            }
        }
    }

    let schemaObject;
    try {
        schemaObject = JSON.parse(packageSchemaFile);
    } catch (error) {
        throw new Error("ERROR_PARSING_PACKAGE_SCHEMA_FILE: " + error.message);
    }

    if (!ajv.validateSchema(schemaObject)) {
        throw new Error("ERROR_READING_SCHEMA");
    }

    const response = ajv.validate(schemaObject, packageFileObject);

    if (!response) {
        throw new Error("INVALID_PACKAGE_FILE_SCHEMA: " + JSON.stringify(ajv.errors));
    }
}
