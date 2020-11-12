import { JSONSchema7, JSONSchema7TypeName } from "json-schema";

/** A description of where the package file should be published. */
export interface RegistryReference {
    /** The DNS hostname or ipv4/v6 address of the registery server. */
    hostname: string;

    /** The TCP port on which the registry is served. All datapm connections are made over HTTPS */
    port: number;

    /** The short name (not the user friendly name) of the catalog in which to publish the package. */
    catalogSlug: string;

    /** Whether the data should be published to the registry, or just the schema. This is important
     * because some data owners want to share only the schema of the data
     */
    publishData: boolean;
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

    /** A relative file reference to the location of the README.md that is published with the package file. */
    readmeFile?: string;

    /** A relative file reference to the locaiton of the LICENSE.md file that is published iwth the package file. */
    licenseFile?: string;

    /** The list of registries, and catalogs, to which this package file should be published. This field is used by
     * the local client to determine where to publish. The client will remove private and local registry references
     * before publishing to each registry.
     */
    registries?: RegistryReference[];
}

/** The JSON Schema Draft 07 compliant schema object, extended with properties that describe
 * how to obtain the data, and details the values of the data properties.
 */
export interface Schema extends JSONSchema7 {
    /** An object describing how to access the bytestream(s) of the data */
    source?: Source;

    /** An object describing how to parse the bytestream(s) into datapm compliant records. */
    parser?: ParserInfo;

    /** The JSON Schema Draft 07 compliant property list for the object */
    properties?: { [key: string]: Schema };

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

    valueTypes?: { [key: string]: ValueTypeStatistics };
}

export interface ParserInfo {
    mimeType: string;

    configuration?: any;
}

/** Describes where the data resides, and how to access to byte stream of the data. */
export interface Source {
    protocol: Protocol;

    /** An object containing valid JSON properties for the purposes of accessing the data. The schema
     * of this object is loose because it is up to the source implementation to define it's own schema
     * configuration.
     */
    configuration?: any;
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

export enum Protocol {
    Http = "HTTP",
    LocalFile = "LOCAL_FILE"
}

export * from "./PackageUtil";
export * from "./CollectionUtil";
