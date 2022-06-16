import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import { JobContext } from "../../task/JobContext";
import { Connector } from "../Connector";
import { TYPE } from "./EventSourceConnectorDescription";
import url from "url";

export class EventSourceConector implements Connector {
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
        return false; // TODO check HTTP connection for requested credentials
    }

    async getRepositoryIdentifierFromConfiguration(connectionConfiguration: DPMConfiguration): Promise<string> {
        const myUrl = new url.URL((connectionConfiguration.url as string) as string);

        let key = myUrl.protocol + "://" + myUrl.hostname + (myUrl.port !== "" ? ":" + myUrl.port : "");

        if (myUrl.pathname.length > 0) {
            key += myUrl.pathname.split("/")[0] + "...";
        }

        return key;
    }

    getCredentialsIdentifierFromConfiguration(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | undefined> {
        throw new Error("Method not implemented.");
    }

    getConnectionParameters(connectionConfiguration: DPMConfiguration): Parameter<string>[] {
        if (connectionConfiguration.url == null) {
            return [
                {
                    configuration: connectionConfiguration,
                    message: "EventSource URL?",
                    name: "url",
                    type: ParameterType.Text,
                    stringRegExp: {
                        pattern: /^https:\/\/|^http:\/\//,
                        message: "Must start with http:// or https://"
                    }
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
        throw new Error("Method not implemented.");
    }

    async testConnection(connectionConfiguration: DPMConfiguration): Promise<string | true> {
        // TODO: Implement
        return true;
    }

    async testCredentials(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | true> {
        // TODO Implement
        return true;
    }
}
