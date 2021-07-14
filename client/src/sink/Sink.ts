import { DPMConfiguration, PackageFile, Schema } from "datapm-lib";
import { Transform } from "stream";
import { Maybe } from "../util/Maybe";
import { UpdateMethod } from "../source/Source";
import { Parameter } from "../util/parameters/Parameter";
import { StreamSetProcessingMethod } from "../util/StreamToSinkUtil";

export enum SinkErrors {
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    CONNECTION_FAILED = "CONNECTION_FAILED"
}

export interface WritableWithContext {
    /** While this is a writer, it should emit records that it has successfully written, so that the system
     * can track offsets accurately in case of errors.
     */
    writable: Transform;

    /** transforms that should be piped in the order provided */
    transforms?: Transform[];

    /** A string such as a URL, or file location, describing where the sink is writing records. For user informational purposes only. */
    outputLocation: string;
}

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

export interface SinkSupportedStreamOptions {
    updateMethods: UpdateMethod[];

    streamSetProcessingMethods: StreamSetProcessingMethod[];
}

export interface SinkDescription {
    /** The universally unique short name, used for configuration reference, of the sink implementation.  */
    getType(): string;

    /** The user friendly name of the sink implementation */
    getDisplayName(): string;

    /** Get the sink implementation from a module, which delays instantiating all the imports */
    loadSinkFromModule(): Promise<Sink>;
}
export interface Sink {
    /** The universally unique short name, used for configuration reference, of the sink implementation.  */
    getType(): string;

    /** The user friendly name of the sink implementation */
    getDisplayName(): string;

    /** Check if sink is strongly typed
     *
     * @param configuration The same configuration object that is the result of the getParameters(...) user responses.
     */
    isStronglyTyped(configuration: DPMConfiguration): Promise<boolean> | boolean;

    /** The defaults for the parameter values that will be given to the user, based on the previously
     * supplied configuration values.
     */
    getDefaultParameterValues(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): Promise<DPMConfiguration> | DPMConfiguration;

    /** Return parameters interatively until no more questions are needed to be answered */
    getParameters(
        catalogSlug: string | undefined,
        schema: PackageFile,
        configuration: DPMConfiguration
    ): Promise<Parameter[]> | Parameter[];

    /** Return a list of supported update methods, based on the configuration, schema, and current sink state */
    getSupportedStreamOptions(configuration: DPMConfiguration, sinkState: Maybe<SinkState>): SinkSupportedStreamOptions;

    /** Apply the configuration to the sink */
    getWriteable(
        schema: Schema,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod
    ): Promise<WritableWithContext>;

    /** For filtering default values from the configuration, for the purposes of showing the minimum necessary information to recreate the configuration.
     * This method should preserve properties who's defaults may change in the future. It should modify the configuration object passed in
     */
    filterDefaultConfigValues(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): void;

    /** Called after updating a sink. The Sink implementation should persist all values of the
     * sinkState object using the sinkStateKey as a reference.
     *
     * @param configuration The same configuration object that is the result of the getParameters(...) user responses.
     *
     * @param sinkStateKey Use all of the properties of this object to create a unique instance of the SinkState object;
     *
     * @param sinkState An object that identifies the last observed state of the sink. This method should create or
     * overwrite the value referenced by the sinkStatekey.
     */
    saveSinkState(configuration: DPMConfiguration, sinkStateKey: SinkStateKey, sinkState: SinkState): Promise<void>;

    /** Called when evaluating the current state of a sink, usually before writing new records. The Sink
     * implementation should use the
     *
     * @param configuration The same configuration object that is the result of the getParameters(...) user responses.
     *
     * @param sinkStateKey Use all of the properties of this object to retreive the SinkState object that was previously saved - if available.
     */
    getSinkState(configuration: DPMConfiguration, SinkStateKey: SinkStateKey): Promise<Maybe<SinkState>>;
}
