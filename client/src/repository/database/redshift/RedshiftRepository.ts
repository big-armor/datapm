import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { getAwsAuthenticationParameters } from "../../../util/AwsUtil";
import { Parameter } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";

export class RedshiftRepository implements Repository {
    requiresConnectionConfiguration(): boolean {
        return false;
    }

    requiresCredentialsConfiguration(): boolean {
        return true;
    }

    async getConnectionIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "Redshift"; // TODO Should probably move these from Source and Sink implementations to here
    }

    async getCredentialsIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "Environment Variables"; // TODO Should probably move these from Source and Sink implementations to here
    }

    getConnectionParameters(_connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        return [];
    }

    async getAuthenticationParameters(
        _connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration
    ): Promise<Parameter[]> {
        const parameters = await getAwsAuthenticationParameters(authenticationConfiguration);
        return parameters;
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true;
    }

    async testCredentials(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO test AWS authentication
    }
}
