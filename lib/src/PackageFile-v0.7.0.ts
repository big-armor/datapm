import { JSONSchema7, JSONSchema7TypeName } from "json-schema";
import { DPMConfiguration } from "./main";

export enum CountPrecision {
    EXACT = "EXACT",
    APPROXIMATE = "APPROXIMATE",
    GREATER_THAN = "GREATER_THAN"
}

export enum PublishMethod {
    /** Publishes only the schema. Client must manually obtain the access credentials to the data */
    SCHEMA_ONLY = "SCHEMA_ONLY",

    /** Publishes the schema and the data as a snapshot or update to the registry */
    SCHEMA_AND_DATA = "SCHEMA_AND_DATA",

    /** Publishes the schema, and sends the necessary access credentials to the registry */
    SCHEMA_PROXY_DATA = "SCHEMA_PROXY_DATA"
}

export interface StreamStats {
    /** The number of bytes observed in the stream. See byteCountPrecision
     * for whether this is an exact, estimated, or "greater than" number.
     */
    byteCount?: number;

    byteCountPrecision?: CountPrecision;

    /** The number of records deeply inspected during the stream */
    inspectedCount: number;

    /** The number of records in the stream. See recordCountPrecision for whether
     * this is an exact, estimated, or "greater than" number.
     */
    recordCount?: number;
    recordCountPrecision?: CountPrecision;
}

/** A description of where the package file should be published. */
export interface RegistryReference {
    /** The HTTP or HTTPS URL to reach the registry server. */
    url: string;

    /** The short name (not the user friendly name) of the catalog in which to publish the package. */
    catalogSlug: string;

    /** How the schema and the data are published to a registry. The various options dictate how the schema is modified before
     * saving it to the registry, and how the data is accessed by the client. */
    publishMethod: PublishMethod;
}

/** Represents a single logical unit of streaming data from a source. For example
 * a file system/SFTP/NFS select of *.xml from a particular directory would be one stream set. Each table in a database would
 * be another stream set.
 */
export interface StreamSet {
    /** The unique identifier for the stream set in a single source */
    slug: string;

    /** Configuration necessary to access the stream set from the source */
    configuration: DPMConfiguration;

    /** The titles of schemas present in this source. One source produces one or more schemas of data. A schema may be present in more than one source. */
    schemaTitles: string[];

    /** The last update hash provided by the source after generating the file package file. This is used
     * to determine if there are new updates available from a source when updating a package file.
     */
    lastUpdateHash?: string;

    /** The number of records last observed */
    streamStats: StreamStats;
}

/** Describes where the data resides, and how to access one or more logical sets of streams. For example, how to
 * access a database, and which tables are each an individual stream set.
 */
export interface Source {
    /** The universally unique identifier for the Source implementation */
    type: string;

    /** The unique identifier for this source in the package */
    slug: string;

    /** An object containing valid JSON properties for the purposes of connecting, but not authenticating,
     * to the source */
    connectionConfiguration: DPMConfiguration;

    /** This value uniquely identifies the access credentials that should be extracted and decrypted
     * from the local configuration store. Access credentials are never saved in the package file.
     */
    credentialsIdentifier?: string;

    /** An object containing valid JSON properties for the purposes of accessing the source. The schema
     * of this object is loose because it is up to the source implementation to define it's own schema
     * configuration. This is used in combination with the StreamSet.configuration to access an individual stream
     */
    configuration?: DPMConfiguration;

    streamSets: StreamSet[];
}

export interface ContentLabel {
    /** The keyword identifier for the content  */
    label: string;

    /** Whether this label has been supressed. This allows users to supress autogenerated labels that would be detected again in the future. */
    hidden: boolean;

    /** If the label was applied by a contentDetector implementation, it's unique name is stored  */
    appliedByContentDetector?: string;

    /** The number of times the label was detected */
    ocurrenceCount?: number;

    /** The number of values tested for this content */
    valuesTestedCount?: number;
}

export interface ValueTypeStatistics {
    valueType: JSONSchema7TypeName | "date";

    /** The number of records on which this property was observed. If schema recordCountApproximate property is true,
     * then not all records were inspected, and therefore this does not represent the exact number of records
     * on which this value type is present */
    recordCount?: number;
    stringMaxLength?: number;
    stringMinLength?: number;
    numberMaxValue?: number;
    numberMinValue?: number;
    dateMaxValue?: Date;
    dateMinValue?: Date;
    stringOptions?: { [key: string]: number };

    /** A dictionary of content labels referencing a boolean value as to whether they should be displayed. This
     * allows content labels to be "hidden" by a package editor - and to keep that fact for future iterations.
     */
    contentLabels?: ContentLabel[];
}

// eslint-disable-next-line no-use-before-define
export type Properties = { [key: string]: Schema };
export type ValueTypes = { [key: string]: ValueTypeStatistics };

export interface MajorVersionIdentifier {
    registryUrl: string;
    catalogSlug: string;
    packageSlug: string;
    majorVersion: number;
}

export interface SchemaIdentifier extends MajorVersionIdentifier {
    schemaTitle: string;
}

export interface StreamIdentifier extends SchemaIdentifier {
    streamSlug: string;
}

export interface DerivedFrom {
    /** User friendly name for the upstream data */
    displayName: string;

    /** A website or direct link for the upstream data. Url or schemaIdentifier must be defined */
    url?: string;

    /** The identifier for the specific version of the datapm package version and schema title. Url or schemaIdentifier must be defined.  */
    schemaIdentifier?: SchemaIdentifier;
}

/** The JSON Schema Draft 07 compliant schema object, extended with properties that describe
 * how to obtain the data, and details the values of the data properties.
 */
export interface Schema extends JSONSchema7 {
    /** A description about the schema or property. This is flat text and should be kept to a few scentences.  */
    description?: string;

    /** The JSON Schema Draft 07 compliant property list for the object */
    properties?: Properties;

    /** Whether the consumer should by default include this schema/property in the regular output */
    hidden?: boolean;

    /** What the schema or a property in the data represents. Example for objects: Person, Date and Location, Point In Time. Examples for values: Meters, Degrees Celsius */
    unit?: string;

    /** The number of records that were inspected during generation of this package file */
    recordsInspectedCount?: number;

    /** The exact or approximate number of records in the schema. For streaming sets, this
     * is the number of records per period.
     */
    recordCount?: number;

    /** The count of records in which this schema object is not present. Note that this does obviously
     * not apply to the root schema object.
     */
    recordsNotPresent?: number;

    /** How to consider the recordCount value - as one of exact, approximate, or greater than. */
    recordCountPrecision?: CountPrecision;

    /** An object which has keys that the property type (string, array, date, boolean, object, etc). The values of this object describe the values of the property. */
    valueTypes?: ValueTypes;

    /** A  selected set of sample records that are representative of the schema */
    sampleRecords?: { [key: string]: unknown }[];

    /** A description or specific SQL used to generate the data in this schema from an upstream set of data in the 'derivedFrom' property. */
    derivedFromDescription?: string;

    /** A list of references to upstream data from which this schema was derived. This is also called "Provenance" */
    derivedFrom?: DerivedFrom[];
}

export class PackageFile {
    /** The URL of the JSON schema file to validate this file. */
    $schema = "https://datapm.io/docs/package-file-schema-v0.7.0.json";

    /** The short name that identifies this package, in the context of the catalog that it is published. */
    packageSlug: string;

    /** The short user friendly name that is shown for display purposes. */
    displayName: string;

    /** The long form, markdown format, description of the contents of this package. Focus on the origin, purpose, use, and features. Not the schema. */
    description: string;

    /** An object describing how to access the record stream of the data */
    sources: Source[];

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
