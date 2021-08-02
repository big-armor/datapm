import { Ora } from "ora";
import prompts from "prompts";
import { DPMConfiguration } from "datapm-lib";
import { Repository } from "../repository/Repository";
import { getRepositoryConfigs, RepositoryConfig } from "./ConfigUtil";
import { repeatedlyPromptParameters } from "./parameters/ParameterUtils";

export async function obtainConnectionConfiguration(
    oraRef: Ora,
    repository: Repository,
    connectionConfiguration: DPMConfiguration,
    defaults: boolean | undefined
): Promise<DPMConfiguration> {
    if (repository.requiresConnectionConfiguration()) {
        // Check whether there are existing configurations for this type of repository
        const existingConfiguration = getRepositoryConfigs(repository.getType());

        if (existingConfiguration.length > 0) {
            const choices: {
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

            const existingConfigurationPromptResult = await prompts({
                name: "connectionConfiguration",
                type: "autocomplete",
                message: "Repository?",
                choices
            });

            if (existingConfigurationPromptResult.connectionConfiguration.identifier !== "**NEW**") {
                connectionConfiguration = (existingConfigurationPromptResult.connectionConfiguration as RepositoryConfig)
                    .connectionConfiguration;
            }
        }

        let connectionSuccess = false;

        while (!connectionSuccess) {
            await repeatedlyPromptParameters(
                async () => {
                    return repository.getConnectionParameters(connectionConfiguration);
                },
                connectionConfiguration,
                defaults || false
            );

            const connectionTestResults = await repository.testConnection(connectionConfiguration);

            if (typeof connectionTestResults === "string") {
                oraRef.warn("Connection failed: " + connectionTestResults);
                connectionConfiguration = {};
            } else {
                connectionSuccess = true;
            }
        }
    }

    return connectionConfiguration;
}
