/* eslint-disable camelcase */
import { DPMConfiguration, nameToSlug, Parameter, ParameterType } from "datapm-lib";
import { Connector } from "../Connector";
import { TYPE } from "./TimeplusConnectorDescription";
import fetch from "cross-fetch";
import { JobContext } from "../../task/JobContext";

export class TimeplusConnector implements Connector {
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

    async getRepositoryIdentifierFromConfiguration(connectionConfiguration: DPMConfiguration): Promise<string> {
        if (typeof connectionConfiguration.host !== "string") {
            throw new Error("Timeplus host not set");
        }
        if (typeof connectionConfiguration.tenant !== "string") {
            throw new Error("Timeplus tenant not set");
        }
        return connectionConfiguration.host + "#" + connectionConfiguration.tenant;
    }

    async getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | undefined> {
        if (credentialsConfiguration.apiKey != null) {
            const apiKey = credentialsConfiguration.apiKey as string;
            // only show the first 20 chars(key id)
            return apiKey.substring(0, 20);
        }

        return undefined;
    }

    getConnectionParameters(connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        if (connectionConfiguration.host == null) {
            parameters.push({
                name: "host",
                type: ParameterType.Text,
                stringMinimumLength: 1,
                configuration: connectionConfiguration,
                defaultValue: "beta.timeplus.cloud",
                message: "Host Name?"
            });
        }
        if (connectionConfiguration.tenant == null) {
            parameters.push({
                name: "tenant",
                type: ParameterType.Text,
                stringMinimumLength: 1,
                configuration: connectionConfiguration,
                message: "Tenant ID(e.g. datapm)?"
            });
        }

        return parameters;
    }

    getCredentialsParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        jobContext: JobContext
    ): Parameter[] | Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        if (credentialsConfiguration.apiKey == null) {
            parameters.push({
                configuration: credentialsConfiguration,
                type: ParameterType.Password,
                name: "apiKey",
                message: "API Key?",
                stringMinimumLength: 60,
                stringMaximumLength: 60
            });
        }

        return parameters;
    }

    async testConnection(): Promise<string | true> {
        // TODO test basic HTTP connection to API
        return true;
    }

    async testCredentials(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | true> {
        const apiKey = getApiKey(credentialsConfiguration);
        const url = `https://${connectionConfiguration.host}/${connectionConfiguration.tenant}/api/v1beta1/streams`;

        const resp = await fetch(url, {
            headers: {
                "X-Api-Key": apiKey,
                Accept: "application/json"
            }
        });

        if (resp.status !== 200) {
            return "Received status code " + resp.status + " from Timeplus.";
        }

        return true;
    }
}
export function getApiKey(credentialsConfiguration: DPMConfiguration): string {
    const apiKey = credentialsConfiguration.apiKey as string;

    if (apiKey == null) {
        throw new Error("Timeplus API key is not set.");
    }

    return apiKey;
}
