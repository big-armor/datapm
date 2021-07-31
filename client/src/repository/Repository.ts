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
    /** The same unique identifier as RepositoryDescription.getType() */
    getType(): string;

    /** Whether this source requires the user provide connection configuration information. Example: MySql and Postgres
     * will require the host and port. Google Big Query is a PaaS that does not require the user provide connection information */
    requiresConnectionConfiguration(): boolean;

    /** Whether this source requires the user provide authentication information. Example: MySql and Postgres will require the
     * user to enter a username and password. A local file system does not. */
    requiresCredentialsConfiguration(): boolean;

    /** Given a complete connnection configuration object, return a string that the user would use
     * to uniquely identify the repository. This is used to identify the repository in the UI.
     *
     * Example: MySQL would return hostname:port. A PaaS like Google Big Query would return a static string because there is only one public instance
     *
     * Return false if no repository information should be saved  */
    getConnectionIdentifierFromConfiguration(configuration: DPMConfiguration): Promise<string>;

    /** Given a complete credentels configuration object, return a string that the user would use
     * to uniquely identify the access credentials. This is used to identify the credentials in the UI.
     *
     * This will not be called if there are no keys on the credentials configuration object */
    getCredentialsIdentifierFromConfiguration(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string>;

    /** Returns the configuration parameters necessary to complete the basic unauthenticated connection. Called
     * repeatedly until no parameters are returned.
     */
    getConnectionParameters(connectionConfiguration: DPMConfiguration): Promise<Parameter[]> | Parameter[];

    /** Returns the parameters necessary to complete the account configuration. Called repeatedly until no
     * parameters are returned
     */
    getAuthenticationParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
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
    testCredentials(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | true>;
}
