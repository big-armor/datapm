/** Used by the Sink to create a unique key for the SinkState object.  */
export interface SinkStateKey {
    catalogSlug: string;
    packageSlug: string;
    packageMajorVersion: number;
}

/** Describes the state of a schema from a single stream. Schemas may be present in more than one stream, and this
 * object does not describe the state of the schema across all streams.
 */

export interface SchemaState {
    lastOffset: number | null;
}

/** The state of an individual stream from a streamSet as written to a sink */
export interface StreamState {
    /** A hash value indicating when the contents of a stream have changed */
    updateHash?: string;

    /** The status of writing records for each schema from a single stream */
    schemaStates: Record<string, SchemaState>;

    /** The last read offset value for a single stream */
    streamOffset?: number;
}

export interface StreamSetState {
    /** A hash value indicating when the contents of a stream have changed */
    updateHash?: string;

    /** The state of reading each stream in the streamSet */
    streamStates: Record<string, StreamState>;
}

/** Stored by the sink to understand the state of a particular stream of data */
export interface SinkState {
    /** The package version applied to a single sink state */
    packageVersion: string; // TODO is this needed?

    /** The time the sink state was saved */
    timestamp: Date;

    /** The state of reading each stream in the streamSet */
    streamSets: Record<string, StreamSetState>;
}
