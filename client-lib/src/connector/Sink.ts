import { DPMConfiguration, PackageFile, Schema, SinkState, SinkStateKey, UpdateMethod, Parameter } from "datapm-lib";
import { Transform } from "stream";
import { JobContext } from "../main";
import { Maybe } from "../util/Maybe";
import { StreamSetProcessingMethod } from "../util/StreamToSinkUtil";

export enum SinkErrors {
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED",
    CONNECTION_FAILED = "CONNECTION_FAILED",
    CONFIGURATION_FAILED = "CONFIGURATION_FAILED"
}

export type CommitKey = Record<string, unknown>;
export interface WritableWithContext {
    /** While this is a writer, it should emit records that it has successfully written, so that the system
     * can track offsets accurately in case of errors.
     */
    writable: Transform;

    /** transforms that should be piped in the order provided */
    transforms?: Transform[];

    /** A string such as a URL, or file location, describing where the sink is writing records. For user informational purposes only. */
    outputLocation: string;

    /** The last offset from previous writes, if this sink supports APPEND_ONLY_LOG mode */
    lastOffset?: number;

    /** Optionally return a function that will be called after the writable is closed. This will return a set of keys
     * that can later be used to "commit the transaction" of this writable along with other writables at the same time.
     * See the #commitAfterWrites() method for more info.
     *
     * Return an empty array if the sink does not support this.
     */
    getCommitKeys: () => CommitKey[];
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

    /** Return parameters interatively until no more questions are needed to be answered */
    getParameters(
        catalogSlug: string | undefined,
        schema: PackageFile,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        jobContext: JobContext
    ): Promise<Parameter[]> | Parameter[];

    /** Return a list of supported update methods, based on the configuration, schema, and current sink state */
    getSupportedStreamOptions(configuration: DPMConfiguration, sinkState: Maybe<SinkState>): SinkSupportedStreamOptions;

    /** Apply the configuration to the sink.
     * @param connectionConfiguration The configuration object that is the result of the Repository.getConnectionParameters(...) user responses.
     * @param credentialsConfiguration The configuration object that is the result of the Repository.getCredentianlsParameters(...) user responses.
     * @param configuration The same configuration object that is the result of the getParameters(...) user responses.
     * @param schema The schema of the stream that is being written to the sink.
     * @param updateMethod The update method that is being used to write to the sink.
     */
    getWriteable(
        schema: Schema,
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        updateMethod: UpdateMethod,
        replaceExistingData: boolean,
        jobContext: JobContext
    ): Promise<WritableWithContext>;

    /**
     * Called after all writes for a set of streams has completed. If possible,
     * this should be done transactionally so that it entirely succeeds or
     * fails.
     *
     * @commitKeys A set of keys provided by #getWritable() that are used to indiciate the
     * sink should commit one or more writeable streams. This is useful for
     * large multiple schema data sets that need to be committed transactionally.
     *
     * An example of committing a write might be deleting the old file/table and replacing it
     * with the new one. Not all sinks support this.
     *
     * @sinkStateKey The key that will later be used to fetch the sinkState object.
     * @sinkState An object containing the state of the sink as compared to the source it came from.
     */
    commitAfterWrites(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        commitKeys: CommitKey[],
        sinkStateKey: SinkStateKey,
        sinkState: SinkState,
        jobContext: JobContext
    ): Promise<void>;

    /** For filtering default values from the configuration, for the purposes of showing the minimum necessary information to recreate the configuration.
     * This method should preserve properties who's defaults may change in the future. It should modify the configuration object passed in
     */
    filterDefaultConfigValues(
        catalogSlug: string | undefined,
        packageFile: PackageFile,
        configuration: DPMConfiguration
    ): void;

    /** Called when evaluating the current state of a sink, usually before writing new records. The Sink
     * implementation should use the
     *
     * @param configuration The same configuration object that is the result of the getParameters(...) user responses.
     *
     * @param sinkStateKey Use all of the properties of this object to retreive the SinkState object that was previously saved - if available.
     */
    getSinkState(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        configuration: DPMConfiguration,
        SinkStateKey: SinkStateKey,
        jobContext: JobContext
    ): Promise<Maybe<SinkState>>;
}
