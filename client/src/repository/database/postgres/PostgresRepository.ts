import { parse } from "pg-connection-string";
import { DPMConfiguration } from "../../../../../lib/dist/src/PackageUtil";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";

export class PostgresRepository implements Repository {
    getDefaultConnectionParameterValues(configuration: DPMConfiguration): DPMConfiguration {
        return {
            host: configuration.host || "localhost",
            port: configuration.port || 5432
        };
    }

    getDefaultAuthenticationParameterValues(configuration: DPMConfiguration): DPMConfiguration {
        return {
            username: configuration.username || "",
            password: configuration.password || ""
        };
    }

    async getConnectionParameters(configuration: DPMConfiguration): Promise<Parameter[]> {
        if (configuration.uris != null && (configuration.uris as string[]).length > 0) {
            const urlConfiguration = this.parseUri((configuration.uris as string[])[0]);

            for (const key of Object.keys(urlConfiguration)) {
                configuration[key] = urlConfiguration[key];
            }

            delete configuration.uris;
        }

        const parameters: Parameter[] = [];

        const defaultParameterValues: DPMConfiguration = this.getDefaultConnectionParameterValues(configuration);

        if (configuration.host == null) {
            parameters.push({
                configuration,
                type: ParameterType.Text,
                name: "host",
                message: "Hostname or IP?",
                defaultValue: defaultParameterValues.host as string
            });
        }

        if (configuration.port == null) {
            parameters.push({
                configuration,
                type: ParameterType.Number,
                name: "port",
                message: "Port?",
                defaultValue: defaultParameterValues.port as number
            });
        }

        return parameters;
    }

    async getAuthenticationParameters(
        connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration
    ): Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        if (authenticationConfiguration.username == null) {
            parameters.push({
                configuration: authenticationConfiguration,
                type: ParameterType.Text,
                name: "username",
                message: "Username?",
                defaultValue: this.getDefaultAuthenticationParameterValues(authenticationConfiguration)
                    .username as string
            });
        }

        if (authenticationConfiguration.password == null) {
            parameters.push({
                configuration: authenticationConfiguration,
                type: ParameterType.Password,
                name: "password",
                message: "Password?",
                defaultValue: this.getDefaultAuthenticationParameterValues(authenticationConfiguration)
                    .password as string
            });
        }

        return parameters;
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // TODO Implement
    }

    async testAuthentication(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO Implement
    }

    parseUri(uri: string): DPMConfiguration {
        const parsedUri = parse(uri);
        const connectionOptions: DPMConfiguration = {
            host: parsedUri.host,
            port: parsedUri.port || null,
            username: parsedUri.user || null,
            password: parsedUri.password || null,
            database: parsedUri.database || null
        };
        Object.keys(connectionOptions).forEach((key) => {
            if (!connectionOptions[key]) delete connectionOptions[key];
        });
        return connectionOptions;
    }
}
