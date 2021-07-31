import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { Parameter } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";

export class BigQueryRepository implements Repository {
    requiresConnectionConfiguration(): boolean {
        return false;
    }

    requiresCredentialsConfiguration(): boolean {
        return true;
    }

    async getConnectionIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "Big Query"; // Fixed for now. Should probably move configuration for project ID and data set from source into this file
    }

    async getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        return "Environment Variables"; // Fixed for now. See above
    }

    getConnectionParameters(_connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        return [];
    }

    getAuthenticationParameters(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        return []; // TODO implement big query authentication ENV reading or configuration parameters
        // DANGER DANGER DANGER -- do not read google credentials from ENV when running in server mode
        // maybe just don't read them from the environment?
        // maybe always run sources in a separate process??
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true;
    }

    async testCredentials(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO test that provided auth is valid with google
    }
}
