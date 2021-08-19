import { DPMConfiguration } from "datapm-lib";
import { Parameter } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";
import { TYPE } from "./LocalFileRepositoryDescription";

export class LocalFileRepository implements Repository {
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
        return false;
    }

    async getConnectionIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "local";
    }

    getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        throw new Error("Method not implemented.");
    }

    getConnectionParameters(_connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        return [];
    }

    getCredentialsParameters(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        return [];
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true;
    }

    async testCredentials(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true;
    }
}