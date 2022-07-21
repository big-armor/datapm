import { DPMConfiguration, ParameterType } from "datapm-lib";
import { Connector } from "../connector/Connector";
import { repeatedlyPromptParameters } from "./parameters/ParameterUtils";
import { JobContext } from "../task/JobContext";
import { RepositoryConfig } from "../config/Config";
import { getConnectorDescriptionByType, PackageIdentifierInput } from "../main";

export async function obtainConnectionConfiguration(
    jobContext: JobContext,
    relatedPackage: PackageIdentifierInput | undefined,
    connector: Connector,
    connectionConfiguration: DPMConfiguration,
    repositoryIdentifier: string | undefined,
    defaults: boolean | undefined,
    overrideDefaultValues: DPMConfiguration = {}
): Promise<
    | { repositoryIdentifier: string | undefined; connectionConfiguration: DPMConfiguration; parameterCount: number }
    | false
> {
    if (!connector.requiresConnectionConfiguration())
        return { repositoryIdentifier: undefined, connectionConfiguration, parameterCount: 0 };

    const connectorDescription = getConnectorDescriptionByType(connector.getType());

    jobContext.setCurrentStep(connectorDescription?.getDisplayName() + " Connection");

    if (repositoryIdentifier != null) {
        const repository = await jobContext.getRepositoryConfig(
            relatedPackage,
            connector.getType(),
            repositoryIdentifier
        );

        if (repository != null) {
            // purposefully made connectionConfiguration overwrite the saved repostiory config
            connectionConfiguration = { ...repository.connectionConfiguration, ...connectionConfiguration };

            jobContext.print("INFO", "Using saved connection info for " + repositoryIdentifier);
        } else {
            jobContext.print("WARN", "Could not find saved connection info for " + repositoryIdentifier);
        }
    }

    let parameterCount = 0;

    // Check whether there are existing configurations for this type of repository
    let savedRepositories: RepositoryConfig[] = [];

    if (connector.userSelectableConnectionHistory())
        savedRepositories = await jobContext.getRepositoryConfigsByType(relatedPackage, connector.getType());

    const pendingParameters = await connector.getConnectionParameters(connectionConfiguration);

    if (
        !repositoryIdentifier &&
        connector.userSelectableConnectionHistory() &&
        pendingParameters.length > 0 &&
        savedRepositories.length > 0
    ) {
        parameterCount++;

        const options: {
            value: RepositoryConfig;
            title: string;
        }[] = [
            ...savedRepositories.map((c) => {
                return { value: c, title: c.identifier };
            }),
            {
                value: {
                    identifier: "**NEW**",
                    connectionConfiguration: {}
                },
                title: "New Repository"
            }
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

    const connectionConfigurationResponse = await promptForConnectionConfiguration(
        jobContext,
        connector,
        connectionConfiguration,
        defaults,
        overrideDefaultValues
    );

    parameterCount += connectionConfigurationResponse.parameterCount;

    const connectionIdentifier = await connector.getRepositoryIdentifierFromConfiguration(
        connectionConfigurationResponse.connectionConfiguration
    );

    return {
        connectionConfiguration: connectionConfigurationResponse.connectionConfiguration,
        parameterCount,
        repositoryIdentifier: connectionIdentifier
    };
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

        const task = await jobContext.startTask("Testing Connection");

        const connectionTestResults = await connector.testConnection(connectionConfiguration);

        if (typeof connectionTestResults === "string") {
            task.end("ERROR", "Connection failed: " + connectionTestResults);
            connectionConfiguration = {};
            continue;
        } else {
            connectionSuccess = true;
        }

        task.end("SUCCESS", "Connection successful");
    }

    return { connectionConfiguration, parameterCount };
}
