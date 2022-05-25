import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import { JobContext } from "../../task/JobContext";
import { Connector } from "../Connector";
import { TYPE } from "./TwitterConnectorDescription";
import { TwitterApi, ETwitterStreamEvent } from "twitter-api-v2";

export class TwitterConnector implements Connector {
    getType(): string {
        return TYPE;
    }

    requiresConnectionConfiguration(): boolean {
        return false;
    }

    userSelectableConnectionHistory(): boolean {
        return false;
    }

    requiresCredentialsConfiguration(): boolean {
        return true;
    }

    async getRepositoryIdentifierFromConfiguration(connectionConfiguration: DPMConfiguration): Promise<string> {
        return "twitter.com";
    }

    async getCredentialsIdentifierFromConfiguration(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | undefined> {
        const bearerToken = credentialsConfiguration.bearerToken as string;

        if (bearerToken == null) return undefined;

        return bearerToken.substring(0, 5) + "..." + bearerToken.substring(bearerToken.length - 5);
    }

    getConnectionParameters(
        connectionConfiguration: DPMConfiguration
    ): Parameter<string>[] | Promise<Parameter<string>[]> {
        return [];
    }

    getCredentialsParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        jobContext: JobContext
    ): Parameter<string>[] | Promise<Parameter<string>[]> {
        if (credentialsConfiguration.bearerToken == null) {
            return [
                {
                    configuration: credentialsConfiguration,
                    name: "bearerToken",
                    message: "Twitter API Bearer Token?",
                    type: ParameterType.Password,
                    stringMinimumLength: 1
                }
            ];
        }

        return [];
    }

    async testConnection(connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true;
    }

    async testCredentials(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | true> {
        const client = new TwitterApi(credentialsConfiguration.bearerToken as string);

        const user = await client.v2.userByUsername("jack");

        if (user.errors) {
            return user.errors.join("\n");
        }

        return true;
    }
}
