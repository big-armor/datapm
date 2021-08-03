import { DPMConfiguration } from "datapm-lib";
import { getAwsAuthenticationParameters } from "../../../util/AwsUtil";
import { Parameter } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";
import { TYPE } from "./S3RepositoryDescription";

export class S3Repository implements Repository {
    getType(): string {
        return TYPE;
    }

    requiresConnectionConfiguration(): boolean {
        return false;
    }

    userSelectableConnectionHistory(): boolean {
        return false;
    }

    requiresCredentialsConfiguration(): boolean {
        return true;
    }

    async getConnectionIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "s3";
    }

    getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        throw new Error("Method not implemented.");
    }

    getConnectionParameters(_connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        return []; // TODO consider moving bucket info here, and access credentials below
    }

    getCredentialsParameters(
        _connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        return getAwsAuthenticationParameters(authenticationConfiguration);
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // TODO implement a quick API connectivity test
    }

    async testCredentials(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO implement authentication
    }
}
