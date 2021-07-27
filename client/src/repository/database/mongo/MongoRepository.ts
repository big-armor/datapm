import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";

export class MongoRepository implements Repository {
    getDefaultParameterValues(configuration: DPMConfiguration): DPMConfiguration {
        return {
            host: configuration.host || "localhost",
            port: configuration.port || 27017,
            username: configuration.username || "",
            password: configuration.password || "",
            database: configuration.database || "datapm"
        };
    }

    getConnectionParameters(connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        const defaultParameterValues: DPMConfiguration = this.getDefaultParameterValues(connectionConfiguration);

        if (connectionConfiguration.host == null) {
            parameters.push({
                configuration: connectionConfiguration,
                type: ParameterType.Text,
                name: "host",
                message: "Hostname or IP?",
                defaultValue: defaultParameterValues.host as string
            });
        }

        if (connectionConfiguration.port == null) {
            parameters.push({
                configuration: connectionConfiguration,
                type: ParameterType.Number,
                name: "port",
                message: "Port?",
                defaultValue: defaultParameterValues.port as number
            });
        }

        return parameters;
    }

    getAuthenticationParameters(
        _connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        if (authenticationConfiguration.username == null) {
            parameters.push({
                configuration: authenticationConfiguration,
                type: ParameterType.Text,
                name: "username",
                message: "Username?"
            });
        }

        if (authenticationConfiguration.password == null) {
            parameters.push({
                configuration: authenticationConfiguration,
                type: ParameterType.Password,
                name: "password",
                message: "Password?"
            });
        }

        return parameters;
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // Should test tcp connection
    }

    async testAuthentication(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO should test authentication
    }
}