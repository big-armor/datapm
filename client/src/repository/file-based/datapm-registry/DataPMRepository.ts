import { DPMConfiguration } from "datapm-lib";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";
import { TYPE } from "./DataPMRepositoryDescription";

export class DataPMRepository implements Repository {
    getType(): string {
        return TYPE;
    }

    requiresConnectionConfiguration(): boolean {
        return true;
    }

    userSelectableConnectionHistory(): boolean {
        return true;
    }

    requiresCredentialsConfiguration(): boolean {
        return false;
    }

    async getConnectionIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "datapm";
    }

    getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        throw new Error("Method not implemented.");
    }

    getConnectionParameters(connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        if (connectionConfiguration.url == null) {
            return [
                {
                    type: ParameterType.Text,
                    message: "Registry URL?",
                    defaultValue: "https://datapm.io",
                    name: "url",
                    configuration: connectionConfiguration
                }
            ];
        }

        return [];
    }

    getCredentialsParameters(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        throw new Error("Method not implemented."); // TODO should this prompt the user for an API key slection? currently only one API key per registry is allowed on one client
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
