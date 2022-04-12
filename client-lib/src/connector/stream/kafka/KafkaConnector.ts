import { DPMConfiguration, Parameter, ParameterType } from "datapm-lib";
import { JobContext } from "../../../task/Task";
import { Connector } from "../../Connector";
import { TYPE } from "./KafkaConnectorDescription";

export class KafkaConnector implements Connector {
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
        if (typeof connectionConfiguration.brokers !== "string") {
            throw new Error("Brokers not set");
        }

        const brokers = connectionConfiguration.brokers.split(",");

        if (brokers == null) throw new Error(" 'brokers' is not defined in the connection configuration.");

        const sortedBrokers = brokers.sort();

        return sortedBrokers.join(",");
    }

    async getCredentialsIdentifierFromConfiguration(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | undefined> {
        if (credentialsConfiguration.authenticationMechanism === "plain" && credentialsConfiguration.username != null)
            return credentialsConfiguration.username as string;

        return undefined;
    }

    getConnectionParameters(
        connectionConfiguration: DPMConfiguration
    ): Parameter<string>[] | Promise<Parameter<string>[]> {
        if (connectionConfiguration.brokers == null) {
            const parameter: Parameter = {
                name: "brokers",
                message: "Brokers?",
                configuration: connectionConfiguration,
                type: ParameterType.Text,
                defaultValue: "localhost:9092",
                validate: (value: string | number | boolean | string[]) => {
                    if (typeof value !== "string") {
                        return "must be a string";
                    }

                    if (value.length === 0) return "Please enter a broker";

                    const parts = value.split(",");
                    for (const part of parts) {
                        if (part.trim().match(/^(?:[\w\-.]+:\d+[,]?)+/)?.length !== 1)
                            return "Must be in host:port,host:port format";
                    }

                    return true;
                }
            };

            return [parameter];
        }

        if (connectionConfiguration.useSsl == null) {
            return [
                {
                    name: "useSsl",
                    configuration: connectionConfiguration,
                    message: "Use SSL?",
                    type: ParameterType.Select,
                    options: [
                        {
                            title: "Yes",
                            value: true
                        },
                        {
                            title: "No",
                            value: false
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
        if (credentialsConfiguration.authenticationMechanism == null) {
            return [
                {
                    name: "authenticationMechanism",
                    configuration: credentialsConfiguration,
                    message: "Authentication Mechanism?",
                    type: ParameterType.Select,
                    options: [
                        {
                            title: "None",
                            value: "none",
                            selected: true
                        },
                        {
                            title: "SASL Plain Text",
                            value: "plain"
                        }
                    ]
                }
            ];
        }

        if (credentialsConfiguration.authenticationMechanism === "plain") {
            if (credentialsConfiguration.username == null) {
                return [
                    {
                        configuration: credentialsConfiguration,
                        name: "username",
                        message: "Username?",
                        type: ParameterType.Text,
                        stringMinimumLength: 1
                    }
                ];
            }

            if (credentialsConfiguration.password == null) {
                return [
                    {
                        configuration: credentialsConfiguration,
                        name: "password",
                        message: "Password?",
                        type: ParameterType.Password,
                        stringMinimumLength: 1
                    }
                ];
            }
        }

        return [];
    }

    async testConnection(connectionConfiguration: DPMConfiguration): Promise<string | true> {
        return true; // TODO implement
    }

    async testCredentials(
        connectionConfiguration: DPMConfiguration,
        credentialsConfiguration: DPMConfiguration
    ): Promise<string | true> {
        return true; // TODO implement
    }
}
