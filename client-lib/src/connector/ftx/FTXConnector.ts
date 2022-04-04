import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import { JobContext } from "../../task/Task";
import { Connector } from "../Connector";
import { TYPE, URI, URI_US } from "./FTXConnectorDescription";

export class FTXConnector implements Connector {
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
        return false;
    }

    async getRepositoryIdentifierFromConfiguration(configuration: DPMConfiguration): Promise<string> {
        return getWebSocketUri(configuration);
    }

    getCredentialsIdentifierFromConfiguration(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        throw new Error("not supposed to be called, requiresCredentialsConfiguration() should be false");
    }

    async getConnectionParameters(connectionConfiguration: DPMConfiguration): Promise<Parameter<string>[]> {
        if (connectionConfiguration.instance == null) {
            return [
                {
                    type: ParameterType.Select,
                    configuration: connectionConfiguration,
                    name: "instance",
                    message: "Select instance",
                    options: [
                        {
                            title: "ftx.com",
                            value: "ftx.com"
                        },
                        {
                            title: "ftx.us",
                            value: "ftx.us"
                        }
                    ]
                }
            ];
        }

        return [];
    }

    getCredentialsParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        jobContext: JobContext
    ): Parameter<string>[] | Promise<Parameter<string>[]> {
        throw new Error("Not suppsoed to be called, requiresCredentialsConfiguration() should be false");
    }

    async testConnection(connectionConfiguration: DPMConfiguration): Promise<string | true> {
        // TODO TCP connection or websocket connection to ws.FTX.com
        return true;
    }

    async testCredentials(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true;
    }
}

export function getWebSocketUri(connectionConfiguration: DPMConfiguration): string {
    let uri = URI;

    if (connectionConfiguration.instance === "ftx.us") {
        uri = URI_US;
    }

    return uri;
}
