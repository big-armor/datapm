/* eslint-disable camelcase */
import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import { Connector } from "../../Connector";
import { TYPE } from "./DecodableConnectorDescription";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import fetch from "cross-fetch";
import os from "os";
import { JobContext } from "../../../main";

type DecodableAuthConfig = {
    tokens: {
        default: {
            access_token: string;
            refresh_token: string;
            id_token: string;
        };
    };
    version: string;
};

export class DecodableConnector implements Connector {
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
        _credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        throw new Error("Method not implemented.");
    }

    getConnectionParameters(connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        const parameters: Parameter[] = [];

        if (connectionConfiguration.account == null) {
            parameters.push({
                name: "account",
                type: ParameterType.Text,
                stringMinimumLength: 1,
                configuration: connectionConfiguration,
                message: "Account Name?"
            });
        }

        return parameters;
    }

    getCredentialsParameters(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration,
        jobContext: JobContext
    ): Parameter[] | Promise<Parameter[]> {
        jobContext.print("INFO", "Use the Decodable CLI login command to authenticate first");

        getAuthToken();

        return [];
    }

    async testConnection(): Promise<string | true> {
        // TODO test basic HTTP connection to aPI
        return true;
    }

    async testCredentials(
        connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        const authToken = getAuthToken();

        const accountsResponse = await fetch(
            `https://${connectionConfiguration.account}.api.decodable.co/v1alpha2/accounts`,
            {
                headers: {
                    Authorization: `Bearer ${authToken}`,
                    Accept: "application/json"
                }
            }
        );

        if (accountsResponse.status !== 200) {
            return "Received status code " + accountsResponse.status + " from Decodable.";
        }

        const accounts = await accountsResponse.json();

        if (accounts.length === 0) {
            return "No accounts found in decodable.";
        }

        return true;
    }
}

export function getAuthToken(): string {
    const decodableAuthFile = path.join(os.homedir(), ".decodable", "auth");

    if (!fs.existsSync(decodableAuthFile)) {
        throw new Error("You must login using the decodable CLI tool before using this connector.");
    }

    const authFile = yaml.load(fs.readFileSync(decodableAuthFile, "utf8")) as DecodableAuthConfig;

    const accessToken = authFile.tokens.default.access_token as string;

    if (accessToken == null) {
        throw new Error("Decodable access token is missing from " + decodableAuthFile);
    }

    return accessToken;
}
