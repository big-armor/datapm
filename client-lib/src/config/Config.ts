import { DPMConfiguration } from "datapm-lib";

export interface RegistryConfig {
    url: string;
    apiPath?: string;
    apiKey?: string;
}

export interface RepositoryCredentialsConfig {
    identifier: string;
    encryptedConfiguration: string;
}
export interface RepositoryConfig {
    /** The unique identifer of the repository */
    identifier: string;

    /** The connection configuration object for the repository, that is used to connect to the repository */
    connectionConfiguration: DPMConfiguration;

    /** An array of string identifiers for each access credential. */
    credentials?: RepositoryCredentialsConfig[];
}

export interface RepositoryType {
    type: string;

    configs: RepositoryConfig[];
}
