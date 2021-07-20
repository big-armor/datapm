import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { getAwsAuthenticationParameters } from "../../../util/AwsUtil";
import { Parameter } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";

export class S3Repository implements Repository {
    getConnectionParameters(_connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        return [];
    }

    getAuthenticationParameters(
        _connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        return getAwsAuthenticationParameters(authenticationConfiguration);
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // TODO implement a quick API connectivity test
    }

    async testAuthentication(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO implement authentication
    }
}
