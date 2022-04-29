/* eslint-disable camelcase */
import { DPMConfiguration, nameToSlug, Parameter, ParameterType } from "datapm-lib";
import { Connector } from "../Connector";
import { TYPE } from "./TimeplusConnectorDescription";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import fetch from "cross-fetch";
import os from "os";
import { JobContext } from "../../task/Task";

const printedTimeplusLoginMessage = false;

export class TimeplusConnector implements Connector {
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

    async getRepositoryIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "stream";
    }

    getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        throw new Error("Method not implemented.");
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

        const accountsResponse = await fetch(`https://${connectionConfiguration.host}/api/v1beta1/streams`, {
            headers: {
                Authorization: `Bearer ${authToken}`,
                Accept: "application/json"
            }
        });

        if (accountsResponse.status !== 200) {
            return "Received status code " + accountsResponse.status + " from Timeplus.";
        }

        const accounts = await accountsResponse.json();

        if (accounts.length === 0) {
            return "No accounts found in Timeplus.";
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
