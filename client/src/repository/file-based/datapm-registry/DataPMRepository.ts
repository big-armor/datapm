import { DPMConfiguration, SocketEvent, TimeoutPromise } from "datapm-lib";
import { io, Socket } from "socket.io-client";
import { Parameter, ParameterType } from "../../../util/parameters/Parameter";
import { Repository } from "../../Repository";
import { TYPE } from "./DataPMRepositoryDescription";
import { getRegistryConfig } from "../../../util/ConfigUtil";

export class DataPMRepository implements Repository {
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
        return false;
    }

    async getConnectionIdentifierFromConfiguration(_configuration: DPMConfiguration): Promise<string> {
        return "datapm";
    }

    getCredentialsIdentifierFromConfiguration(
        _connectionConfiguration: DPMConfiguration,
        _credentialsConfiguration: DPMConfiguration
    ): Promise<string> {
        throw new Error("Method not implemented.");
    }

    getConnectionParameters(connectionConfiguration: DPMConfiguration): Parameter[] | Promise<Parameter[]> {
        if (connectionConfiguration.url == null) {
            return [
                {
                    type: ParameterType.Text,
                    message: "Registry URL?",
                    defaultValue: "https://datapm.io",
                    name: "url",
                    configuration: connectionConfiguration
                }
            ];
        }

        return [];
    }

    getCredentialsParameters(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Parameter[] | Promise<Parameter[]> {
        throw new Error("Method not implemented."); // TODO should this prompt the user for an API key slection? currently only one API key per registry is allowed on one client
    }

    async testConnection(_connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // TODO implement a quick API connectivity test
    }

    async testCredentials(
        _connectionConfiguration: DPMConfiguration,
        _authenticationConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO implement authentication
    }
}

export async function connectSocket(
    connectionConfiguration: DPMConfiguration,
    _credentialsConfiguration: DPMConfiguration
): Promise<Socket> {
    if (typeof connectionConfiguration.url !== "string") {
        throw new Error("connectionConfiguration does not include url value as string");
    }

    const uri = connectionConfiguration.url.replace(/^https/, "wss").replace(/^http/, "ws");

    const registryConfiguration = getRegistryConfig(connectionConfiguration.url);

    if (registryConfiguration == null) {
        throw new Error("REGISTRY_CONFIG_NOT_FOUND: " + uri);
    }

    const socket = io(uri, {
        path: "/ws/",
        parser: require("socket.io-msgpack-parser"),
        transports: ["polling", "websocket"],
        auth: {
            token: registryConfiguration.apiKey
        }
    });

    await new TimeoutPromise<void>(5000, (resolve) => {
        socket.once("connect", async () => {
            socket.once(SocketEvent.READY.toString(), () => {
                resolve();
            });
        });
    });

    return socket;
}
