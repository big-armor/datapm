import { DPMConfiguration, DPMRecord } from "../../../lib/dist/src/PackageUtil";
import { JSONSchema7TypeName } from "json-schema";
import { StreamState } from "./Sink";
import { Maybe } from "../util/Maybe";
import { Readable, Transform } from "stream";
import { Schema, StreamStats } from "../../../lib/dist/src/PackageFile-v0.5.0";
import { LogType } from "../util/LoggingUtils";
import { Parameter } from "../util/parameters/Parameter";

export enum SourceErrors {
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    CONNECTION_FAILED = "CONNECTION_FAILED",
    DATABASE_NOT_FOUND = "DATABASE_NOT_FOUND"
}

/** How updates are provided from the source */
export enum UpdateMethod {
    BATCH_FULL_SET = "BATCH_FULL_SET", // All records, every time
    APPEND_ONLY_LOG = "APPEND_ONLY_LOG" // New records are append (uses offsets)
}

export type ExtendedJSONSchema7TypeName = JSONSchema7TypeName | "binary" | "date";

/** Created by Source implementations to identify the record. */
export interface RecordContext {
    schemaSlug: string;

    record: DPMRecord;

    /** The offset used to resume at this point */
    offset?: number;
}

/** Created by the internal system to identify a record received from a source, and tag it with additional properties */
export interface RecordStreamContext {
    /** The unique stream set slug from which the record was produced. */
    streamSetSlug: string;

    /** The unique stream slug from which the record was produced.  */
    streamSlug: string;

    /** The wrapped recordContext - which comes from the Source */
    recordContext: RecordContext;
}

/** represents a single real data stream before opening that stream. For example, an enumeration of HTTP or local files - but without doing any expensive operations to discover the meta data about those files.  */
export interface StreamSummary {
    /** The unique name of this stream. */
    name: string;

    /** The number of bytes expected before opening the stream */
    expectedTotalRawBytes?: number;

    /** The number of records expected before opening the stream */
    expectedRecordCount?: number;

    updateHash?: string;

    openStream: (sinkState: Maybe<StreamState>) => Promise<StreamAndTransforms>;
}
export interface StreamAndTransforms {
    /** The source stream, before transforms, that produces raw data */
    stream: Readable;

    /** The transforms that are applied in order to produce records. */
    transforms?: Transform[];

    /** The expected raw bytes for this stream, after opening the stream. Generally from connection headers, etc */
    expectedTotalRawBytes?: number;

    /** The expected number of records for this stream, after opening the stream. Generally from connection headers, etc */
    expectedRecordCount?: number;
}
/** Represents a single logical grouping of real streams returned during URI inspection. */
export interface StreamSetPreview {
    /** The unique identifier for the stream set in a single source */
    slug: string;

    // TODO This may not ever be needed.
    configuration: DPMConfiguration;

    /** The update methods  supported by this source */
    supportedUpdateMethods: UpdateMethod[];

    /** The source provides this value to determine whether this particular stream has been updated since it was last read */
    updateHash?: string;

    // The expected number of bytes for this stream set
    expectedBytesTotal?: number;

    // The expected count of records for this stream set
    expectedRecordsTotal?: number;

    /** The summary for each stream of data avilable, should be returned in sorted order */
    streamSummaries?: StreamSummary[];

    /** The iterator for each stream of data available */
    moveToNextStream?(): Promise<StreamSummary | null>;
}

export interface InspectionResults {
    /** The name that is used by default for the package name */
    defaultDisplayName: string;
    source: Source;
    configuration: DPMConfiguration;
    streamSetPreviews: StreamSetPreview[];
}

export interface SourceInspectionContext {
    /** Request information from the user. */
    parameterPrompt: (parameters: Parameter[]) => Promise<void>;

    /** Add to the output console log */
    log(type: LogType, message: string): void;

    /** Whether defaults flag is enabled. Sources should then not prompt, but use defaults when possible.  */
    defaults: boolean;

    /** Whether the quiet flag is enabled - in which no user outputs are allowed. */
    quiet: boolean;
}

export interface SourceDescription {
    /** A universally unique identifier for the source implementation. */
    sourceType(): string;

    /** Given a full or partial URI, return a boolean as to whether it could be supported. Example, a MySQL implementation
     * would return true for the string 'mysql://` or even just `mysql.
     */
    supportsURI(uri: string): boolean;

    getSource(): Promise<Source>;
}
export interface Source {
    /** A universally unique identifier for the source implementation. */
    sourceType(): string;

    /** Remove sensitive config values from the configuration before saving into package file */
    removeSecretConfigValues(configuration: DPMConfiguration): void;

    /** Inspects a given URI and discovers the content */
    inspectURIs(configuration: DPMConfiguration, context: SourceInspectionContext): Promise<InspectionResults>;
}

export interface Property {
    title: string;
    description?: string;
    type?: ExtendedJSONSchema7TypeName;
    format?: string;
}

export interface InspectProgress {
    recordCount: number;
    recordsInspectedCount: number;
    bytesProcessed: number;
    recordsPerSecond: number;
}

export interface StreamStatusContext {
    onStart(streamName: string): void;
    onProgress(progress: InspectProgress): void;
    onComplete(progress: InspectProgress): void;
    onError(error: Error): void;
}

export interface SourceStreamsInspectionResult {
    schemas: Schema[];

    streamStats: StreamStats;
}
