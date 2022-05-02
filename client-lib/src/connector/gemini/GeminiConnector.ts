import { DPMConfiguration, Parameter } from "datapm-lib";
import { JobContext } from "../../task/JobContext";
import { Connector } from "../Connector";
import { TYPE, URI_BASE } from "./GeminiConnectorDescription";

export class GeminiConnector implements Connector {
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
        return false;
    }

    async getRepositoryIdentifierFromConfiguration(configuration: DPMConfiguration): Promise<string> {
        return URI_BASE;
    }

    getCredentialsIdentifierFromConfiguration(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        throw new Error("not supposed to be called, requiresCredentialsConfiguration() should be false");
    }

    getConnectionParameters(
        connectionConfiguration: DPMConfiguration
    ): Parameter<string>[] | Promise<Parameter<string>[]> {
        throw new Error("Not supposed to be called, requiresConnectionConfiguration() should be false");
    }

    getCredentialsParameters(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration,
        jobContext: JobContext
    ): Parameter<string>[] | Promise<Parameter<string>[]> {
        throw new Error("Not suppsoed to be called, requiresCredentialsConfiguration() should be false");
    }

    async testConnection(connectionConfiguration: DPMConfiguration): Promise<string | true> {
        // TODO TCP connection or websocket connection to ws-feed.exchange.gemini.com
        return true;
    }

    async testCredentials(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true;
    }
}
