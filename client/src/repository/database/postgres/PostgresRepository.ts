import { parse } from "pg-connection-string";
import { DPMConfiguration } from "datapm-lib";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";
import { TYPE } from "./PostgresRepositoryDescription";

export class PostgresRepository implements Repository {
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
        return true;
    }

    async getConnectionIdentifierFromConfiguration(configuration: DPMConfiguration): Promise<string> {
        return configuration.host + ":" + configuration.port;
    }

    async getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        return credentialsConfiguration.username as string;
    }

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

    async getConnectionParameters(connectionConfiguration: DPMConfiguration): Promise<Parameter[]> {
        if (connectionConfiguration.uris != null && (connectionConfiguration.uris as string[]).length > 0) {
            const urlConfiguration = this.parseUri((connectionConfiguration.uris as string[])[0]);

            for (const key of Object.keys(urlConfiguration)) {
                connectionConfiguration[key] = urlConfiguration[key];
            }

            delete connectionConfiguration.uris;
        }

        const parameters: Parameter[] = [];

        const defaultParameterValues: DPMConfiguration = this.getDefaultConnectionParameterValues(
            connectionConfiguration
        );

        if (connectionConfiguration.host == null) {
            parameters.push({
                configuration: connectionConfiguration,
                type: ParameterType.Text,
                name: "host",
                message: "Hostname or IP?",
                min: 1,
                defaultValue: defaultParameterValues.host as string
            });
        }

        if (connectionConfiguration.port == null) {
            parameters.push({
                configuration: connectionConfiguration,
                type: ParameterType.Number,
                name: "port",
                message: "Port?",
                min: 1,
                defaultValue: defaultParameterValues.port as number
            });
        }

        return parameters;
    }

    async getCredentialsParameters(
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
                min: 1,
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
                min: 1,
                defaultValue: this.getDefaultAuthenticationParameterValues(authenticationConfiguration)
                    .password as string
            });
        }

        return parameters;
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // TODO Implement
    }

    async testCredentials(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO Implement
    }

    parseUri(uri: string): DPMConfiguration {
        const parsedUri = parse(uri);
        const connectionOptions: DPMConfiguration = {
            host: parsedUri.host,
            port: parsedUri.port || (parsedUri.database !== null ? 5432 : null),
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
