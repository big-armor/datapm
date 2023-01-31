import { SemVer } from "semver";
import fs from "fs";
import path from "path";
import AJV from "ajv";
import fetch from "cross-fetch";
import { PackageFileV010 } from "./PackageFile-v0.1.0";
import { CountPrecisionV020, PackageFileV020, SchemaV020 } from "./PackageFile-v0.2.0";

import deepEqual from "fast-deep-equal";
import { PackageFileV030, CountPrecisionV030 } from "./PackageFile-v0.3.0";
import { PackageFile040 } from "./PackageFile-v0.4.0";
import { PackageFile050 } from "./PackageFile-v0.5.0";
import { PackageFile060, Source060 } from "./PackageFile-v0.6.0";
import { PackageFile070 } from "./PackageFile-v0.7.0";
import { PackageFile080 } from "./PackageFile-v0.8.0";
import { PackageFile as PackageFile081 } from "./PackageFile-v0.8.1";
import { PackageFile as PackageFile090, Properties as Properties090 } from "./PackageFile-v0.9.0";
import { PackageFile as PackageFile0315 } from "./PackageFile-v0.31.5";
import {
    PackageFile,
    PublishMethod,
    RegistryReference,
    Schema,
    Source,
    StreamSet,
    Properties,
    ValueTypeStatistics,
    Property,
    ValueTypes
} from "./PackageFile-v0.32.1";
import { DATAPM_VERSION } from "./DataPMVersion";
import { UpdateMethod } from "./DataHandlingUtil";

export type DPMPropertyTypes =
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "date"
    | "date-time"
    | "object"
    | "array"
    | "null";
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
export type DPMConfiguration = Record<
    string,
    number | string | boolean | { [key: string]: unknown } | string[] | number[] | boolean[] | null
>;

/** Created by Source implementations to identify the record. And passed through the processes
 * that transmit or persit the record
 */
export interface RecordContext {
    schemaSlug: string;

    record: DPMRecord;

    /** The offset used to resume at this point */
    offset?: number;

    /** The timestamp of receiving the record in datapm */
    receivedDate: Date;
}

/** Created by the internal system to identify a record received from a source, and tag it with additional properties */
export interface RecordStreamContext {
    /** The source type (unique identifier of the source implementation) from which the record was produced */
    sourceType: string;

    /** The source slug defined by the source implementation, that uniquely identifies this source configuration in the package file */
    sourceSlug: string;

    /** The unique stream set slug from which the record was produced. */
    streamSetSlug: string;

    /** The unique stream slug from which the record was produced.  */
    streamSlug: string;

    /** The wrapped recordContext - which comes from the Source */
    recordContext: RecordContext;

    /** The update method defined by the stream at the time of producing the record */
    updateMethod: UpdateMethod;
}

export enum Compability {
    Identical = 0,
    MinorChange = 1,
    CompatibleChange = 2,
    BreakingChange = 3
}

/**
 * CHANGE_PROPERTY_FORMAT @deprecated
 */
export enum DifferenceType {
    REMOVE_SCHEMA = "REMOVE_SCHEMA",
    REMOVE_HIDDEN_SCHEMA = "REMOVE_HIDDEN_SCHEMA",
    ADD_SCHEMA = "ADD_SCHEMA",
    REMOVE_SOURCE = "REMOVE_SOURCE",
    CHANGE_PACKAGE_DISPLAY_NAME = "CHANGE_PACKAGE_DISPLAY_NAME",
    CHANGE_PACKAGE_DESCRIPTION = "CHANGE_PACKAGE_DESCRIPTION",
    CHANGE_SOURCE = "CHANGE_SOURCE",
    CHANGE_SOURCE_CONNECTION = "CHANGE_SOURCE_CONNECTION",
    CHANGE_SOURCE_CREDENTIALS = "CHANGE_SOURCE_CREDENTIALS",
    CHANGE_SOURCE_CONFIGURATION = "CHANGE_SOURCE_CONFIGURATION",
    CHANGE_STREAM_UPDATE_METHOD = "CHANGE_STREAM_UPDATE_METHOD",
    CHANGE_SOURCE_URIS = "CHANGE_SOURCE_URIS", // APPLIES ONLY TO PackageFileV040 and earlier
    CHANGE_STREAM_STATS = "CHANGE_STREAM_STATS",
    CHANGE_STREAM_UPDATE_HASH = "CHANGE_STREAM_UPDATE_HASH",
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

    if (priorSource == null && newSource != null) {
        response.push({ type: DifferenceType.CHANGE_SOURCE, pointer: pointer });
    } else if (newSource == null && priorSource != null) {
        response.push({ type: DifferenceType.CHANGE_SOURCE, pointer: pointer });
    } else if (priorSource != null && newSource != null) {
        if (priorSource.type !== newSource.type) {
            response.push({ type: DifferenceType.CHANGE_SOURCE, pointer: pointer });
        } else {
            const configComparison = compareConfigObjects(priorSource.configuration, newSource.configuration);

            if (!configComparison)
                response.push({ type: DifferenceType.CHANGE_SOURCE_CONFIGURATION, pointer: pointer });

            const connectionComparison = compareConfigObjects(
                priorSource.connectionConfiguration,
                newSource.connectionConfiguration
            );

            if (!connectionComparison)
                response.push({ type: DifferenceType.CHANGE_SOURCE_CONNECTION, pointer: pointer });

            if (priorSource.credentialsIdentifier !== newSource.credentialsIdentifier)
                response.push({ type: DifferenceType.CHANGE_SOURCE_CREDENTIALS, pointer: pointer });
        }
    }

    for (const priorStreamSet of priorSource.streamSets) {
        const newStreamSet = newSource.streamSets.find((ssB) => ssB.slug === priorStreamSet.slug);

        if (!newStreamSet) {
            response.push({ type: DifferenceType.REMOVE_STREAM_SET, pointer });
            continue;
        }

        const updateMethodComparison = compareArrays(newStreamSet.updateMethods, priorStreamSet.updateMethods);

        if (!updateMethodComparison) {
            response.push({ type: DifferenceType.CHANGE_STREAM_UPDATE_METHOD, pointer });
        }
        response = response.concat(compareStream(priorStreamSet, newStreamSet, pointer));
    }

    return response;
}

/** Compare two individual schemas, returning the least
 * compatiblility of their features.
 */
export function compareSchema(priorSchema: Schema, newSchema: Schema, pointer = "#"): Difference[] {
    // Do not consider title comparison - assumes intent to compare
    // priorSchema.title!==newSchema.title

    pointer += "/" + newSchema.title;

    const response = compareProperties(priorSchema.properties, newSchema.properties, pointer);

    return response;
}

export function compareProperties(priorProperties: Properties, newProperties: Properties, pointer = "#"): Difference[] {
    const response: Difference[] = [];

    // forward comparison of properties
    for (const priorKey of Object.keys(priorProperties)) {
        const propertyPointer = pointer + "/properties/" + priorKey;
        const newKeys = Object.keys(newProperties);

        if (newKeys.indexOf(priorKey) === -1) {
            if (priorProperties[priorKey].hidden) {
                response.push({
                    type: DifferenceType.REMOVE_HIDDEN_PROPERTY,
                    pointer: propertyPointer
                });
            } else {
                response.push({
                    type: DifferenceType.REMOVE_PROPERTY,
                    pointer: propertyPointer
                });
            }
            continue;
        }

        const priorProperty = priorProperties[priorKey];

        const newProperty = newProperties[priorKey];

        if (priorProperty.description !== newProperty.description)
            response.push({
                type: DifferenceType.CHANGE_PROPERTY_DESCRIPTION,
                pointer: propertyPointer
            });

        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        const priorSchemaValueTypes = Object.keys(priorProperty.types!);
        const newSchemaValueTypes = Object.keys(newProperty.types ?? []);

        if (
            !priorSchemaValueTypes.every((v) => newSchemaValueTypes.indexOf(v) !== -1) ||
            !newSchemaValueTypes.every((v) => priorSchemaValueTypes.indexOf(v) !== -1)
        )
            response.push({ type: DifferenceType.CHANGE_PROPERTY_TYPE, pointer: propertyPointer });

        if (priorProperty.hidden !== true && newProperty.hidden === true) {
            response.push({ type: DifferenceType.HIDE_PROPERTY, pointer: propertyPointer });
        } else if (priorProperty.hidden === true && newProperty.hidden !== true) {
            response.push({ type: DifferenceType.UNHIDE_PROPERTY, pointer: propertyPointer });
        }

        if (priorProperty.unit !== newProperty.unit)
            response.push({ type: DifferenceType.CHANGE_PROPERTY_UNIT, pointer: propertyPointer });
    }

    // Compare in reverse, as a compatible change
    for (const newKey of Object.keys(newProperties)) {
        const propertyPointer = pointer + "/properties/" + newKey;

        const priorProperty = priorProperties[newKey];

        if (priorProperty == null) {
            response.push({
                type: DifferenceType.ADD_PROPERTY,
                pointer: propertyPointer
            });
        } else if (priorProperty.types.object?.objectProperties != null && newProperties[newKey].types.object != null) {
            const changes = compareProperties(
                priorProperty.types.object.objectProperties,
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                newProperties[newKey].types.object!.objectProperties!,
                propertyPointer
            );

            response.push(...changes);
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
export function compareArrays(priorArray?: unknown[] | null, newArray?: unknown[] | null): boolean {
    if (priorArray == null && newArray == null) return true;

    if ((priorArray == null && newArray != null) || (priorArray != null && newArray == null)) return false;

    return deepEqual(priorArray, newArray);
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

            case DifferenceType.CHANGE_SOURCE:
            case DifferenceType.CHANGE_SOURCE_CONFIGURATION:
            case DifferenceType.CHANGE_SOURCE_CONNECTION:
            case DifferenceType.CHANGE_SOURCE_CREDENTIALS:
            case DifferenceType.REMOVE_HIDDEN_PROPERTY:
            case DifferenceType.REMOVE_HIDDEN_SCHEMA:
            case DifferenceType.CHANGE_VERSION: // this just requires that the number be at least one minor version greater, it doesn't return the actual difference
            case DifferenceType.REMOVE_SOURCE:
            case DifferenceType.REMOVE_STREAM_SET:
            case DifferenceType.CHANGE_PROPERTY_UNIT:
            case DifferenceType.CHANGE_PACKAGE_DESCRIPTION:
            case DifferenceType.CHANGE_PACKAGE_DISPLAY_NAME:
            case DifferenceType.CHANGE_PROPERTY_DESCRIPTION:
            case DifferenceType.CHANGE_README_MARKDOWN:
            case DifferenceType.CHANGE_LICENSE_MARKDOWN:
            case DifferenceType.CHANGE_WEBSITE:
            case DifferenceType.CHANGE_CONTACT_EMAIL:
                returnValue = Math.max(returnValue, Compability.MinorChange);
                break;

            case DifferenceType.CHANGE_STREAM_UPDATE_HASH:
            case DifferenceType.CHANGE_STREAM_STATS:
            case DifferenceType.CHANGE_GENERATED_BY:
            case DifferenceType.CHANGE_UPDATED_DATE:
            case DifferenceType.CHANGE_README_FILE:
            case DifferenceType.CHANGE_LICENSE_FILE:
            case DifferenceType.CHANGE_STREAM_UPDATE_METHOD:
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
    if (!fs.existsSync(packageFilePath)) throw new Error("FILE_NOT_FOUND - " + packageFilePath);

    let packageFileAbsolutePath;
    if (path.isAbsolute(packageFilePath)) {
        packageFileAbsolutePath = path.dirname(packageFilePath);
    } else {
        packageFileAbsolutePath = process.cwd() + path.sep + path.dirname(packageFilePath);
    }

    let packageFile;

    const packageFileContents = fs.readFileSync(packageFilePath).toString();

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
        delete packageFile.readmeFile;
    }

    if (packageFile.licenseFile != null) {
        const licenseFileAbsolutePath = packageFileAbsolutePath + path.sep + packageFile.licenseFile;

        if (!fs.existsSync(licenseFileAbsolutePath)) {
            throw new Error("LICENSE_FILE_NOT_FOUND: " + licenseFileAbsolutePath);
        }

        packageFile.licenseMarkdown = fs.readFileSync(licenseFileAbsolutePath).toString();
        delete packageFile.licenseFile;
    }

    return packageFile;
}

function massagePackageFile(packageFile: PackageFile): void {
    if (typeof packageFile.updatedDate === "string") {
        packageFile.updatedDate = new Date(packageFile.updatedDate);
    }

    for (const schema of packageFile.schemas) {
        for (const propertyKey of Object.keys(schema.properties)) {
            const property = schema.properties[propertyKey];

            massageProperty(property);
        }
    }
}

function massageProperty(property: Property) {
    if (typeof property.firstSeen === "string") {
        property.firstSeen = new Date(property.firstSeen);
    }

    if (typeof property.lastSeen === "string") {
        property.lastSeen = new Date(property.lastSeen);
    }

    massageValueTypeStats(property.types);
}

function massageValueTypeStats(valueTypes?: ValueTypes) {
    if (valueTypes == null) return;

    if (typeof valueTypes.date?.dateMaxValue === "string") {
        valueTypes.date.dateMaxValue = new Date(valueTypes.date.dateMaxValue);
    }

    if (typeof valueTypes.date?.dateMinValue === "string") {
        valueTypes.date.dateMinValue = new Date(valueTypes.date.dateMinValue);
    }

    if (valueTypes.array?.arrayTypes != null) {
        massageValueTypeStats(valueTypes.array.arrayTypes);
    }

    if (valueTypes.object?.objectProperties != null) {
        for (const property of Object.values(valueTypes.object.objectProperties)) {
            massageProperty(property);
        }
    }
}

export async function parsePackageFileJSONInBrowser(packageFileString: string): Promise<PackageFile> {
    try {
        let packageFile = JSON.parse(packageFileString) as PackageFile;

        await validatePackageFileInBrowser(packageFile);

        massagePackageFile(packageFile);

        packageFile = upgradePackageFile(packageFile);

        return packageFile;
    } catch (error) {
        throw new Error("ERROR_PARSING_PACKAGE_FILE - " + error.message);
    }
}

export function parsePackageFileJSON(packageFileString: string): PackageFile {
    try {
        let packageFile = JSON.parse(packageFileString) as PackageFile;

        const isBrowser = typeof window !== "undefined" && typeof window.document !== "undefined";

        validatePackageFile(packageFile);

        massagePackageFile(packageFile);

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
            (schema as SchemaV020).recordsInspectedCount = schema.recordCount;
            (schema as SchemaV020).recordCountPrecision =
                schema.recordCountApproximate === true ? CountPrecisionV020.APPROXIMATE : CountPrecisionV020.EXACT;
            delete schema.recordCountApproximate;
        }
    }

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.2.0.json") {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.3.0.json";

        const oldPackageFile = packageFileObject as PackageFileV020;
        const newPackagefile = packageFileObject as PackageFileV030;

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
                                    byteCountPrecision: (schema.byteCountPrecision as unknown) as CountPrecisionV030,
                                    recordCount: schema.recordCount,
                                    recordCountPrecision: (schema.recordCountPrecision as unknown) as CountPrecisionV030
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

                    if (oldValueType.dateMaxValue === null) {
                        delete oldValueType.dateMaxValue;
                    }

                    if (oldValueType.dateMinValue === null) {
                        delete oldValueType.dateMinValue;
                    }

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

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.4.0.json") {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.5.0.json";

        const oldPackageFile = packageFileObject as PackageFile040;

        for (const oldSchema of oldPackageFile.sources) {
            (oldSchema.configuration as DPMConfiguration).uris = oldSchema.uris;
        }
    }

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.5.0.json") {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.6.0.json";

        const oldPackageFile = packageFileObject as PackageFile050;

        for (const oldSource of oldPackageFile.sources) {
            const newSource = (oldSource as unknown) as Source060;
            newSource.connectionConfiguration = oldSource.configuration || {};
        }
    }

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.6.0.json") {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.7.0.json";

        const oldPackageFile = packageFileObject as PackageFile060;

        for (const oldRegistry of oldPackageFile.registries || []) {
            const newRegistry = oldRegistry as RegistryReference;
            newRegistry.publishMethod = PublishMethod.SCHEMA_ONLY;
        }
    }

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.7.0.json") {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.8.0.json";

        const oldPackageFile = packageFileObject as PackageFile070;

        const newPackageFile = (oldPackageFile as unknown) as PackageFile080;

        if (newPackageFile.canonical == null) {
            newPackageFile.canonical = true;
        }
    }

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.8.0.json") {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.8.1.json";

        const oldPackageFile = packageFileObject as PackageFile080;

        const newPackageFile = (oldPackageFile as unknown) as PackageFile;

        for (const source of newPackageFile.sources) {
            for (const streamSet of source.streamSets) {
                if (streamSet.updateMethods == null) {
                    streamSet.updateMethods = [];
                }
            }
        }
    }

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.8.1.json") {
        const packageFile = (packageFileObject as unknown) as PackageFile081;

        for (const source of packageFile.sources) {
            if (source.configuration?.filePattern != null) {
                source.configuration.fileRegex = source.configuration.filePattern;
                delete source.configuration.filePattern;
            }
        }
    }

    if (packageFileObject.$schema === "https://datapm.io/docs/package-file-schema-v0.8.1.json") {
        packageFileObject.$schema = "https://datapm.io/docs/package-file-schema-v0.9.0.json";

        const oldPackageFile = packageFileObject as PackageFile081;

        const newPackageFile = (oldPackageFile as unknown) as PackageFile;

        for (const schema of oldPackageFile.schemas) {
            const oldSchemaProperties = schema.properties ?? {};
            for (const propertyKey of Object.keys(oldSchemaProperties)) {
                const oldProperty = oldSchemaProperties[propertyKey];
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                const newProperty = newPackageFile.schemas.find((s) => s.title === schema.title)!.properties[
                    propertyKey
                ];

                newProperty.types = {};

                for (const oldValueTypeName of Object.keys(oldProperty.valueTypes ?? {})) {
                    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                    const oldValueType = oldProperty.valueTypes![oldValueTypeName];

                    if (oldValueTypeName === "integer") {
                        newProperty.types.integer = oldValueType;
                    } else if (oldValueTypeName === "number") {
                        newProperty.types.number = oldValueType;
                    } else if (oldValueTypeName === "string") {
                        newProperty.types.string = oldValueType;
                    } else if (oldValueTypeName === "boolean") {
                        newProperty.types.boolean = oldValueType;
                    } else if (oldValueTypeName === "date") {
                        newProperty.types.date = oldValueType;
                    } else if (oldValueTypeName === "date-time") {
                        newProperty.types["date-time"] = oldValueType;
                    } else if (oldValueTypeName === "object") {
                        newProperty.types.object = oldValueType;
                    } else if (oldValueTypeName === "array") {
                        newProperty.types.array = oldValueType;
                    } else if (oldValueTypeName === "null") {
                        newProperty.types.null = oldValueType;
                    }
                }

                delete oldProperty.valueTypes;
            }
        }
    }

    if ((packageFileObject.$schema as string).endsWith("v0.9.0.json")) {
        packageFileObject.$schema = (packageFileObject.$schema as string).replace("0.9.0", "0.31.5");

        const oldPackageFile = packageFileObject as PackageFile090;

        const recurseProperties = (properties: Properties090): void => {
            for (const propertyKey of Object.keys(properties)) {
                const oldProperty = properties[propertyKey];
                const newProperty = properties[propertyKey] as Property;
                if (oldProperty.properties != null && oldProperty.types.object != null) {
                    newProperty.types.object = {
                        ...oldProperty.types.object,
                        objectProperties: oldProperty.properties
                    };

                    recurseProperties(oldProperty.properties);
                    delete oldProperty.properties;
                }
            }
        };

        for (const schema of oldPackageFile.schemas) {
            recurseProperties(schema.properties);
        }
    }

    if ((packageFileObject.$schema as string).endsWith("v0.31.5.json")) {
        packageFileObject.$schema = (packageFileObject.$schema as string).replace("0.31.5", "0.32.1");

        const oldPackageFile = packageFileObject as PackageFile0315;

        if (oldPackageFile.readmeFile != null && oldPackageFile.readmeMarkdown != null)
            delete oldPackageFile.readmeFile;

        if (oldPackageFile.licenseFile != null && oldPackageFile.licenseMarkdown != null)
            delete oldPackageFile.licenseFile;

        if (oldPackageFile.readmeFile == null && oldPackageFile.readmeMarkdown == null)
            oldPackageFile.readmeMarkdown =
                "# " + oldPackageFile.displayName ?? oldPackageFile.packageSlug + "\n\n No readme defined";

        if (oldPackageFile.licenseFile == null && oldPackageFile.licenseMarkdown == null)
            oldPackageFile.licenseMarkdown = "No license defined";
    }

    return packageFileObject as PackageFile;
}

export async function validatePackageFileInBrowser(packageFile: PackageFile): Promise<void> {
    const ajv = new AJV({
        format: false // https://www.npmjs.com/package/ajv#redos-attack
    });

    let packageSchemaFile: string;

    const schemaVersion = getSchemaVersionFromPackageFile(packageFile);

    const response = await fetch("/static/datapm-package-file-schema-v" + schemaVersion.format() + ".json");

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

    const ajvResponse = ajv.validate(schemaObject, packageFile);

    if (!ajvResponse) {
        throw new Error("INVALID_PACKAGE_FILE_SCHEMA: " + JSON.stringify(ajv.errors));
    }
}

/** Given a raw package file JSON object, return the version of the package file schema from the $schema value. This handles
 * legacy values.
 */
// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types,@typescript-eslint/no-explicit-any
export function getSchemaVersionFromPackageFile(packageFileObject: any): SemVer {
    let packageFileSchemaUrl = packageFileObject.$schema as string;

    if (packageFileSchemaUrl == null)
        packageFileSchemaUrl = "https://datapm.io/static/datapm-package-file-schema-v0.1.0.json";

    const schemaVersion = packageFileSchemaUrl.match(/v(.*)\.json/i);

    if (schemaVersion == null) throw new Error("ERROR_SCHEMA_VERSION_NOT_RECOGNIZED - " + packageFileSchemaUrl);

    return new SemVer(schemaVersion[1]);
}

export function validatePackageFile(packageFile: PackageFile): void {
    const ajv = new AJV({
        format: false // https://www.npmjs.com/package/ajv#redos-attack
    });

    let packageSchemaFile: string;

    const schemaVersion = getSchemaVersionFromPackageFile(packageFile);

    const datapmVersion = new SemVer(DATAPM_VERSION);

    if (schemaVersion.compare(datapmVersion) === 1) {
        throw new Error("ERROR_SCHEMA_VERSION_TOO_NEW - " + schemaVersion.format());
    }

    const schemaFileName = "packageFileSchema-v" + schemaVersion.format() + ".json";

    try {
        const pathToSchemaFile = path.join(__dirname, "..", schemaFileName);
        packageSchemaFile = fs.readFileSync(pathToSchemaFile, "utf8");
    } catch (error) {
        try {
            const pathToSchemaFile = path.join("node_modules", "datapm-lib", schemaFileName);
            packageSchemaFile = fs.readFileSync(pathToSchemaFile, "utf8");
        } catch (error) {
            try {
                packageSchemaFile = fs.readFileSync(schemaFileName, "utf8");
            } catch (error) {
                const pathToSchemaFile = path.join(__dirname, "..", "lib", schemaFileName);
                packageSchemaFile = fs.readFileSync(pathToSchemaFile, "utf8");
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

    const response = ajv.validate(schemaObject, packageFile);

    if (!response) {
        throw new Error("INVALID_PACKAGE_FILE_SCHEMA: " + JSON.stringify(ajv.errors));
    }
}
