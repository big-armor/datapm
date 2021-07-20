import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { getAwsAuthenticationParameters } from "../../../util/AwsUtil";
import { Parameter } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";

export class RedshiftRepository implements Repository {
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

    async testAuthentication(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO test AWS authentication
    }
}
