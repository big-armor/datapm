import { DPMConfiguration, ParameterType } from "datapm-lib";
import { Connector } from "../connector/Connector";
import { repeatedlyPromptParameters } from "./parameters/ParameterUtils";
import { JobContext } from "../task/Task";
import { RepositoryConfig } from "../config/Config";

export async function obtainConnectionConfiguration(
    jobContext: JobContext,
    connector: Connector,
    connectionConfiguration: DPMConfiguration,
    defaults: boolean | undefined,
    overrideDefaultValues: DPMConfiguration = {}
): Promise<{ connectionConfiguration: DPMConfiguration; parameterCount: number } | false> {
    if (!connector.requiresConnectionConfiguration()) return { connectionConfiguration, parameterCount: 0 };

    // Check whether there are existing configurations for this type of repository
    const existingConfiguration = jobContext.getRepositoryConfigsByType(connector.getType());

    const pendingParameters = await connector.getConnectionParameters(connectionConfiguration);

    if (
        connector.userSelectableConnectionHistory() &&
        pendingParameters.length > 0 &&
        existingConfiguration.length > 0
    ) {
        const options: {
            value: RepositoryConfig;
            title: string;
        }[] = [
            {
                value: {
                    identifier: "**NEW**",
                    connectionConfiguration: {}
                },
                title: "New Repository"
            },
            ...existingConfiguration.map((c) => {
                return { value: c, title: c.identifier };
            })
        ];

        const existingConfigurationPromptResult = await jobContext.parameterPrompt([
            {
                name: "connectionConfiguration",
                type: ParameterType.AutoComplete,
                message: "Repository?",
                options,
                configuration: {}
            }
        ]);

        if (existingConfigurationPromptResult.connectionConfiguration == null) {
            return false;
        }

        if (existingConfigurationPromptResult.connectionConfiguration.identifier !== "**NEW**") {
            connectionConfiguration = (existingConfigurationPromptResult.connectionConfiguration as RepositoryConfig)
                .connectionConfiguration;
        }
    }

    return promptForConnectionConfiguration(
        jobContext,
        connector,
        connectionConfiguration,
        defaults,
        overrideDefaultValues
    );
}

export async function promptForConnectionConfiguration(
    jobContext: JobContext,
    connector: Connector,
    connectionConfiguration: DPMConfiguration,
    defaults: boolean | undefined,
    overrideDefaultValues: DPMConfiguration = {}
): Promise<{ connectionConfiguration: DPMConfiguration; parameterCount: number }> {
    let connectionSuccess = false;

    let parameterCount = 0;
    while (!connectionSuccess) {
        parameterCount += await repeatedlyPromptParameters(
            jobContext,
            async () => {
                const parameters = await connector.getConnectionParameters(connectionConfiguration);

                return parameters;
            },
            defaults || false,
            overrideDefaultValues
        );

        const connectionTestResults = await connector.testConnection(connectionConfiguration);

        if (typeof connectionTestResults === "string") {
            jobContext.print("ERROR", "Connection failed: " + connectionTestResults);
            connectionConfiguration = {};
        } else {
            connectionSuccess = true;
        }
    }
    return { connectionConfiguration, parameterCount };
}
