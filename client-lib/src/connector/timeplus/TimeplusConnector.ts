/* eslint-disable camelcase */
import { DPMConfiguration, nameToSlug, Parameter, ParameterType } from "datapm-lib";
import { Connector } from "../Connector";
import { TYPE } from "./TimeplusConnectorDescription";
import fetch from "cross-fetch";
import { JobContext } from "../../task/JobContext";

const printedTimeplusLoginMessage = false;

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
        return connectionConfiguration.host;
    }

    async getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | undefined> {
        if (credentialsConfiguration.token != null) {
            const token = credentialsConfiguration.token as string;
            return token;
            // only show the first 4 chars and the last 4 chars
            // return token.substring(0, 4) + "**" + token.substring(token.length - 3);
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
                message: "Host Name(e.g. a.beta.timeplus.com)?"
            });
        }

        return parameters;
    }

    getCredentialsParameters(
        _connectionConfiguration: DPMConfiguration,
        authenticationConfiguration: DPMConfiguration,
        jobContext: JobContext
    ): Parameter[] | Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        if (authenticationConfiguration.token == null) {
            parameters.push({
                configuration: authenticationConfiguration,
                type: ParameterType.Password,
                name: "token",
                message: "API Token?"
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
        const authToken = getAuthToken(credentialsConfiguration);
        const url = `https://${connectionConfiguration.host}/api/v1beta1/streams`;

        const resp = await fetch(url, {
            headers: {
                Authorization: `Bearer ${authToken}`,
                Accept: "application/json"
            }
        });

        if (resp.status !== 200) {
            return "Received status code " + resp.status + " from Timeplus.";
        }

        return true;
    }
}
export function getAuthToken(credentialsConfiguration: DPMConfiguration): string {
    const accessToken = credentialsConfiguration.token as string;

    if (accessToken == null) {
        throw new Error("Timeplus token is not set.");
    }

    return accessToken;
}
