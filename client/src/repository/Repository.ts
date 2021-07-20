import { DPMConfiguration } from "../../../lib/dist/src/PackageUtil";
import { SinkDescription } from "./Sink";
import { SourceDescription } from "./Source";
import { Parameter } from "../util/parameters/Parameter";

/** Respresents a specific implementation of a data repository (postgres, s3, etc) */
export interface RepositoryDescription {
    /** The user friendly name of this type of repository */
    getDisplayName(): string;

    /** A univerally unique string that identifies this type of respository */
    getType(): string;

    /** returns the repository implementation. This should be implemented as a module loading
     * pattern, so that dependency imports are delayed until this method is called. */
    getRepository(): Promise<Repository>;

    /** returns the source implementation for this repository. */
    getSourceDescription(): Promise<SourceDescription | null>;

    /** Returns the sink implementation for this repository. */
    getSinkDescription(): Promise<SinkDescription | null>;

    hasSource(): boolean;

    hasSink(): boolean;
}

export interface Repository {
    /** Returns the configuration parameters necessary to complete the basic unauthenticated connection. Called
     * repeatedly until no parameters are returned.
     */
    getConnectionParameters(connectionConfiguration: DPMConfiguration): Promise<Parameter[]> | Parameter[];

    /** Returns the parameters necessary to complete the account configuration. Called repeatedly until no
     * parameters are returned
     */
    getAuthenticationParameters(
        connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration
    ): Promise<Parameter[]> | Parameter[];

    /** Called after getConnectionParameters, but BEFORE authentication parameters, to validate that the
     * target service is reachable. This should allow the user to understand whether or not there is a service
     * to authenticate with.
     *
     * Implementations should only import their resources inside this testConnection method,and not at the top of the
     * source file. This delays loading large libraries until the user is ready to initiate a connection
     */
    testConnection(connectionConfiguration: DPMConfiguration): Promise<string | true>;

    /** Called after testConnection(...) returns true and the user has completed getAuthenticationParameters(...). This
     * test validates that the service is reachable and that the provided authentication information is valid.
     */
    testAuthentication(
        connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration
    ): Promise<string | true>;
}
