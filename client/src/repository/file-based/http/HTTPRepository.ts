import url from "url";
import { DPMConfiguration } from "datapm-lib";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";
import { TYPE } from "./HTTPRepositoryDescription";

export class HTTPRepository implements Repository {
    getType(): string {
        return TYPE;
    }

    requiresConnectionConfiguration(): boolean {
        return true;
    }

    userSelectableConnectionHistory(): boolean {
        return false;
    }

    requiresCredentialsConfiguration(): boolean {
        return true;
    }

    async getConnectionIdentifierFromConfiguration(connectionConfiguration: DPMConfiguration): Promise<string> {
        const myUrl = new url.URL((connectionConfiguration.uris as string[])[0] as string);

        let key = myUrl.protocol + "://" + myUrl.hostname + (myUrl.port !== "" ? ":" + myUrl.port : "");

        if (myUrl.pathname.length > 0) {
            key += myUrl.pathname.split("/")[0] + "...";
        }

        return key;
    }

    async getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        return "anonymous"; // TODO implement HTTP auth detection and return parameters;
    }

    getConnectionParameters(connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        if (typeof connectionConfiguration.uri === "string") {
            connectionConfiguration.uris = [connectionConfiguration.uri];
            delete connectionConfiguration.uri;
        }

        let parameters: Parameter[] = [];

        if (
            connectionConfiguration.addAnother === true ||
            connectionConfiguration.uris == null ||
            (connectionConfiguration.uris as string[]).length === 0
        ) {
            parameters = [
                {
                    configuration: connectionConfiguration,
                    type: ParameterType.Text,
                    name: "uri",
                    message: "URL of file?",
                    stringRegExp: {
                        pattern: /^https:\/\/|^http:\/\//,
                        message: "Must start with http:// or https://"
                    }
                },
                {
                    configuration: connectionConfiguration,
                    type: ParameterType.Confirm,
                    message: "Add another file?",
                    name: "addAnother",
                    defaultValue: false
                }
            ];
        }

        delete connectionConfiguration.addAnother;

        return parameters;
    }

    getCredentialsParameters(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        return []; // Implement HTTP auth, or allow the user to enter HTTP Headers if necessary
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // TODO implement connection testing. OPTIONS maybe?
    }

    async testCredentials(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true;
    }
}
