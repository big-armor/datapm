import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import { JobContext } from "../../task/JobContext";
import { Connector } from "../Connector";
import { TYPE } from "./BinanceConnectorDescription";

export class BinanceConnector implements Connector {
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
                            title: "binance.com",
                            value: "binance.com"
                        },
                        {
                            title: "binance.us",
                            value: "binance.us"
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
        // TODO TCP connection or websocket connection to ws.binance.com
        return true;
    }

    async testCredentials(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true;
    }
}

export function getWebSocketUri(configuration: DPMConfiguration): string {
    if (configuration.instance === "binance.us") {
        return "wss://stream.binance.us:9443/stream";
    }

    return "wss://stream.binance.com:9443/stream";
}
