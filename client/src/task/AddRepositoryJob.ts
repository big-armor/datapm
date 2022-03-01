import { DPMConfiguration } from "datapm-lib";
import { RepositoryAddArguments } from "../command/RepositoryCommand";
import { Repository, RepositoryDescription } from "../repository/Repository";
import { getRepositoryDescriptionByType, getRepositoryDescriptions } from "../repository/RepositoryUtil";
import { getRepositoryConfigs, saveRepositoryConfig } from "../util/ConfigUtil";
import { promptForConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration } from "../util/CredentialsUtil";
import { ParameterType } from "../util/parameters/Parameter";
import { Job, JobContext, JobResult } from "./Task";

export class AddRepositoryJobResult {
    repository: Repository;
    repositoryIdentifier: string;
}

export class AddRepositoryJob extends Job<AddRepositoryJobResult> {
    constructor(private jobContext: JobContext, private argv: RepositoryAddArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<AddRepositoryJobResult>> {
        this.jobContext.setCurrentStep("Adding a Repository");

        const { repository, repositoryDescription } = await promptForRepositoryType(
            this.jobContext,
            this.argv.repositoryType
        );

        let connectionConfiguration: DPMConfiguration = {};

        this.jobContext.setCurrentStep(repositoryDescription.getDisplayName() + " Connection Information");

        const connectionConfigurationResponse = await promptForConnectionConfiguration(
            this.jobContext,
            repository,
            connectionConfiguration,
            false
        );

        connectionConfiguration = connectionConfigurationResponse.connectionConfiguration;

        const repositoryIdentifier = await repository.getConnectionIdentifierFromConfiguration(connectionConfiguration);

        const task = await this.jobContext.startTask("Saving connection configuration...");

        const existingRepsitoryConfig = getRepositoryConfigs(repositoryDescription.getType()).find(
            (c) => c.identifier === repositoryIdentifier
        );

        saveRepositoryConfig(repositoryDescription.getType(), {
            identifier: repositoryIdentifier,
            connectionConfiguration,
            credentials: existingRepsitoryConfig ? existingRepsitoryConfig.credentials : []
        });

        await task.end(
            "SUCCESS",
            "Saved " + repositoryDescription.getDisplayName() + " connection configuration for " + repositoryIdentifier
        );

        if (repository.requiresCredentialsConfiguration()) {
            this.jobContext.setCurrentStep(repositoryIdentifier + " Credentials");

            const credentialsResult = await obtainCredentialsConfiguration(
                this.jobContext,
                repository,
                connectionConfiguration,
                {},
                false,
                {}
            );

            if (credentialsResult === false) {
                return {
                    exitCode: 1
                };
            }

            const credentialsConfiguration = credentialsResult.credentialsConfiguration;

            await repository.getCredentialsIdentifierFromConfiguration(
                connectionConfiguration,
                credentialsConfiguration
            );
        }

        return {
            exitCode: 0,
            result: {
                repository,
                repositoryIdentifier
            }
        };
    }
}

export async function promptForRepositoryType(
    jobContext: JobContext,
    repositoryType?: string
): Promise<{ repository: Repository; repositoryDescription: RepositoryDescription }> {
    if (!repositoryType) {
        const repositoryTypeResult = await jobContext.parameterPrompt([
            {
                type: ParameterType.AutoComplete,
                name: "type",
                message: "Type?",
                configuration: {},
                options: getRepositoryDescriptions()
                    .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()))
                    .map((s) => {
                        return { value: s.getType(), title: s.getDisplayName() };
                    })
            }
        ]);

        repositoryType = repositoryTypeResult.type;
    }

    if (repositoryType == null) {
        throw new Error("Repository type is required.");
    }

    const maybeRepositoryDescription = getRepositoryDescriptionByType(repositoryType);

    if (maybeRepositoryDescription == null) {
        throw new Error(`Unknown repository type: ${repositoryType}`);
    }

    const repositoryDescription = maybeRepositoryDescription;

    const repository = await repositoryDescription.getRepository();

    if (!repository.requiresConnectionConfiguration()) {
        jobContext.print("WARN", repositoryDescription.getDisplayName() + " does not require connection configuration");
        throw new Error("CANCELLED");
    }

    if (!repository.userSelectableConnectionHistory()) {
        jobContext.print(
            "WARN",
            repositoryDescription.getDisplayName() + " does not support saving repository connection information"
        );
        throw new Error("CANCELLED");
    }

    return { repository, repositoryDescription };
}
