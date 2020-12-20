import { JSONSchema7, JSONSchema7TypeName } from "json-schema";
import { DPMConfiguration } from "./PackageUtil";

/** A description of where the package file should be published. */
export interface RegistryReference {
    /** The HTTP or HTTPS URL to reach the registry server. */
    url: string;

    /** The short name (not the user friendly name) of the catalog in which to publish the package. */
    catalogSlug: string;
}

/** Describes where the data resides, and how to access to byte stream of the data. */
export interface Source {
    /** The universally unique identifier for the sourceInterface implementation */
    type: string;

    /** The URI used for accessing the data */
    uri: string;

    /** An object containing valid JSON properties for the purposes of accessing the data. The schema
     * of this object is loose because it is up to the source implementation to define it's own schema
     * configuration.
     */
    configuration?: DPMConfiguration;

    /** The last update hash provided by the source after generating the file package file. This is used
     * to determine if there are new updates available from a source when updating a package file.
     */
    lastUpdateHash: string;
}

export interface ValueTypeStatistics {
    valueType: JSONSchema7TypeName | "date";
    recordCount?: number;
    stringMaxLength?: number;
    stringMinLength?: number;
    numberMaxValue?: number;
    numberMinValue?: number;
    dateMaxValue?: Date;
    dateMinValue?: Date;
    stringOptions?: { [key: string]: number };
}

// eslint-disable-next-line no-use-before-define
export type Properties = { [key: string]: Schema };
export type ValueTypes = { [key: string]: ValueTypeStatistics };

/** The JSON Schema Draft 07 compliant schema object, extended with properties that describe
 * how to obtain the data, and details the values of the data properties.
 */
export interface Schema extends JSONSchema7 {
    /** An object describing how to access the record stream of the data */
    source?: Source;

    /** The JSON Schema Draft 07 compliant property list for the object */
    properties?: Properties;

    /** What the schema or a property in the data represents. Example for objects: Person, Date and Location, Point In Time. Examples for values: Meters, Degrees Celsius */
    unit?: string;

    /** The exact or approximate number of records in the data package. For streaming sets, this
     * is the number of records per period.
     */
    recordCount?: number;

    /** The count of records in which this schema object is not present. Note that this does obviously
     * not apply to the root schema object.
     */
    recordsNotPresent?: number;

    /** Whether the recordCount value is exact or approximate. */
    recordCountApproximate?: boolean;

    /** The exact or approximate number of bytes of data in the values of the data (not including format overhead) */
    byteCount?: number;

    /** Whether the byte count is exact or approximate. */
    byteCountApproximate?: boolean;

    /** A object which has keys that the property type (string, array, date, boolean, object, etc). The values of this object describe the property type. */
    valueTypes?: ValueTypes;

    /** A  selected set of sample records that are representative of the schema */
    sampleRecords?: { [key: string]: unknown }[];
}

export interface PackageFile {
    /** The short name that identifies this package, in the context of the catalog that it is published. */
    packageSlug: string;

    /** The short user friendly name that is shown for display purposes. */
    displayName: string;

    /** The long form, markdown format, description of the contents of this package. Focus on the origin, purpose, use, and features. Not the schema. */
    description: string;

    /** The json-schema.org Draft 7 compliant schemas, extended to support the features of datapm. */
    schemas: Schema[];

    /** The semver compatible version number. */
    version: string;

    /** The name and contact information of the person or organization that last updated the package. */
    generatedBy: string;

    /** The date and time of the latest update to this package file, not the data its self. */
    updatedDate: Date;

    /** A relative file reference to the location of the README.md that is published with the package file. This is generally ignored by the registry server, and only used by the client to fill the readmeMarkdown contents. */
    readmeFile?: string;

    /** The contents of the readme file */
    readmeMarkdown?: string;

    /** A relative file reference to the locaiton of the LICENSE.md file that is published iwth the package file.  This is generally ignored by the registry server, and only used by the client to fill the licenseMarkdown contents. */
    licenseFile?: string;

    /** The contents of the license file */
    licenseMarkdown?: string;

    /** The information or marketing URL of the website for the publisher of the package. */
    website?: string;

    /** The contact email address for the publisher */
    contactEmail?: string;

    /** The list of registries, and catalogs, to which this package file should be published. This field is used by
     * the local client to determine where to publish. The client will remove private and local registry references
     * before publishing to each registry.
     */
    registries?: RegistryReference[];
}

export * from "./PackageUtil";
export * from "./CollectionUtil";
