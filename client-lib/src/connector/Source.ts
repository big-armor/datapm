import { StreamState, DPMConfiguration, Schema, StreamStats, UpdateMethod } from "datapm-lib";
import { Maybe } from "../util/Maybe";
import { Readable, Transform } from "stream";
import { JobContext } from "../task/JobContext";

export enum SourceErrors {
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    CONNECTION_FAILED = "CONNECTION_FAILED",
    DATABASE_NOT_FOUND = "DATABASE_NOT_FOUND"
}

/** represents a single real data stream before opening that stream. For example, an enumeration of HTTP or local files - but without doing any expensive operations to discover the meta data about those files.  */
export interface StreamSummary {
    /** The unique name of this stream. */
    name: string;

    /** The number of bytes expected before opening the stream */
    expectedTotalRawBytes?: number;

    /** The number of records expected before opening the stream */
    expectedRecordCount?: number;

    updateMethod: UpdateMethod;

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

    /** The source provides this value to determine whether this particular stream has been updated since it was last read */
    updateHash?: string;

    // The expected number of bytes for this stream set
    expectedBytesTotal?: number;

    // The expected count of records for this stream set
    expectedRecordsTotal?: number;

    /** The summary for each stream of data avilable, should be returned in sorted order */
    streamSummaries?: StreamSummary[];

    /** Used only if streamSummaries is not provided. An iterator that provides an indetermined number of StreamSummaries - until none are available. Useful in big data situations */
    moveToNextStream?(): Promise<StreamSummary | null>;
}

export interface InspectionResults {
    /** The name that is used by default for the package name */
    defaultDisplayName: string;
    source: Source;
    configuration: DPMConfiguration;
    streamSetPreviews: StreamSetPreview[];
}

export type ConnectorConfigurationSet = {
    connectionConfiguration: DPMConfiguration;
    credentialsConfiguration: DPMConfiguration;
    configuration: DPMConfiguration;
};

export interface SourceDescription {
    /** A universally unique identifier for the source implementation. */
    sourceType(): string;

    /** The user friendly name of the source implementation */
    getDisplayName(): string;

    /** Given a full or partial URI, return a boolean as to whether it could be supported. Example, a MySQL implementation
     * would return true for the string 'mysql://` or even just `mysql.
     */
    supportsURI(uri: string): false | ConnectorConfigurationSet;

    /** Returns an instance of the source. Use a delayed import pattern to ensure that loading of dependencies is
     * delayed until the source is actually used. */
    getSource(): Promise<Source>;
}
export interface Source {
    /** A universally unique identifier for the source implementation. */
    sourceType(): string;

    /** Inspects a given URI and returns an InspectionResult, which includes stream set previews */
    inspectData(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<InspectionResults>;
}

export interface InspectProgress {
    currentStreamName: string;
    msRemaining: number;
    recordCount: number;
    recordsInspectedCount: number;
    bytesProcessed: number;
    recordsPerSecond: number;
    /** Whether this is the final inspection progress report */
    final: boolean;
}

export interface StreamStatusContext {
    onStart(streamName: string): void;
    onReconnect(streamName: string): void;
    onProgress(progress: InspectProgress): void;
    onComplete(progress: InspectProgress): void;
}

export interface SourceStreamsInspectionResult {
    schemas: Schema[];

    streamStats: StreamStats;

    updateMethods: UpdateMethod[];

    /** Wether the end of all streams in the set was reached */
    endReached: boolean;
}
