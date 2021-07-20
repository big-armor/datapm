import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";

export class HTTPRepository implements Repository {
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
                    name: "addAnother"
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
        return []; // Implement HTTP auth if necessary
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // TODO implement connection testing. OPTIONS maybe?
    }

    async testAuthentication(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true;
    }
}
