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

    requiresCredentialsConfiguration(): boolean {
        return true;
    }

    async getConnectionIdentifierFromConfiguration(configuration: DPMConfiguration): Promise<string> {
        const myUrl = new url.URL((configuration.uris as string[])[0] as string);

        let key = myUrl.protocol + "://" + myUrl.hostname + (myUrl.port !== "" ? ":" + myUrl.port : "");

        if (myUrl.pathname.length > 0) {
            key += myUrl.pathname.split("/")[0] + "...";
        }

        return key;
    }

    getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        throw new Error("Method not implemented.");
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
                    validate: (value: string | number | boolean) => {
                        if (value == null || (value as string).length === 0) {
                            return "URL required";
                        }

                        const strValue = value as string;

                        if (!strValue.startsWith("http://") && !strValue.startsWith("https://")) {
                            return "Must start with http:// or https://";
                        }

                        return true;
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

    getAuthenticationParameters(
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
