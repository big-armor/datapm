/* eslint-disable camelcase */
import { DPMConfiguration, nameToSlug, Parameter, ParameterType } from "datapm-lib";
import { Connector } from "../Connector";
import { TYPE } from "./DecodableConnectorDescription";
import yaml from "js-yaml";
import fs from "fs";
import path from "path";
import fetch from "cross-fetch";
import os from "os";
import { JobContext } from "../../task/JobContext";

type DecodableAuthConfig = {
    tokens: {
        [key: string]: {
            access_token: string;
            refresh_token: string;
            id_token: string;
        };
    };
    version: string;
};

type DecodableConfig = {
    version: string;
    "active-profile": string;
    profiles: {
        [key: string]: {
            account: string;
        };
    };
};

let printedDecodableLoginMessage = false;

export class DecodableConnector implements Connector {
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
        return connectionConfiguration.account as string;
    }

    async getCredentialsIdentifierFromConfiguration(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        return credentialsConfiguration.profile as string;
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
        credentialsConfiguration: DPMConfiguration,
        jobContext: JobContext
    ): Parameter[] | Promise<Parameter[]> {
        if (!printedDecodableLoginMessage) {
            jobContext.print("INFO", "Use the Decodable CLI login command to authenticate first");
            printedDecodableLoginMessage = true;
        }

        if (credentialsConfiguration.profile == null) {
            const authConfig = getDecodableAuthConfig();

            const config = getDecodableConfig();

            const defaultProfile = config["active-profile"] || "default";

            return [
                {
                    name: "profile",
                    type: ParameterType.AutoComplete,
                    stringMinimumLength: 1,
                    configuration: credentialsConfiguration,
                    message: "Auth Profile Name?",
                    defaultValue: defaultProfile,
                    options: Object.keys(authConfig.tokens)
                        .map((profile) => ({
                            title: profile,
                            value: profile,
                            selected: profile === defaultProfile
                        }))
                        .sort((a, b) => a.title.localeCompare(b.title))
                }
            ];
        } else {
            getAuthToken(credentialsConfiguration);
        }

        return [];
    }

    async testConnection(): Promise<string | true> {
        // TODO test basic HTTP connection to aPI
        return true;
    }

    async testCredentials(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | true> {
        const authToken = getAuthToken(credentialsConfiguration);

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

export function getAuthToken(credentialsConfiguration: DPMConfiguration): string {
    const authFile = getDecodableAuthConfig();

    if (typeof credentialsConfiguration.profile !== "string") {
        throw new Error("Credentials configuration is missing decodable profile name");
    }

    const profile = credentialsConfiguration.profile;

    const authProfile = authFile.tokens[profile];

    if (authProfile == null) {
        throw new Error(`No profile ${profile} found in decodable auth file`);
    }

    const accessToken = authProfile.access_token as string;

    if (accessToken == null) {
        throw new Error("Decodable auth profile " + profile + " does not contain an access token.");
    }

    return accessToken;
}

function getDecodableAuthConfig(): DecodableAuthConfig {
    const decodableAuthFile = path.join(os.homedir(), ".decodable", "auth");

    if (!fs.existsSync(decodableAuthFile)) {
        throw new Error("You must login using the decodable CLI tool before using this connector.");
    }

    const authFile = yaml.load(fs.readFileSync(decodableAuthFile, "utf8")) as DecodableAuthConfig;

    if (authFile.tokens == null || Object.keys(authFile.tokens).length === 0) {
        throw new Error(decodableAuthFile + " file contains no tokens. Login with Decodable CLI tool.");
    }

    return authFile;
}

function getDecodableConfig(): DecodableConfig {
    const decodableConfigFile = path.join(os.homedir(), ".decodable", "config");

    if (!fs.existsSync(decodableConfigFile)) {
        throw new Error("You must login using the decodable CLI tool before using this connector.");
    }

    const authFile = yaml.load(fs.readFileSync(decodableConfigFile, "utf8")) as DecodableConfig;

    if (authFile.profiles == null || Object.keys(authFile.profiles).length === 0) {
        throw new Error(decodableConfigFile + " file contains no profiles. Login with Decodable CLI tool.");
    }

    return authFile;
}
