import { RepositoryUpdateArguments } from "../command/RepositoryCommand";
import { Repository } from "../repository/Repository";
import { getRepositoryConfigs, removeRepositoryConfig, saveRepositoryConfig } from "../util/ConfigUtil";
import { promptForConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration } from "../util/CredentialsUtil";
import { ParameterType } from "../util/parameters/Parameter";
import { promptForRepositoryType } from "./AddRepositoryJob";
import { Job, JobContext, JobResult } from "./Task";

export class UpdateRepositoryJobResult {
    repository: Repository;
    newRepositoryIdentifier: string;
}

export class UpdateRepositoryJob extends Job<UpdateRepositoryJobResult> {
    constructor(private jobContext: JobContext, private argv: RepositoryUpdateArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<UpdateRepositoryJobResult>> {
        this.jobContext.setCurrentStep("Update a Repository");

        const { repository, repositoryDescription } = await promptForRepositoryType(
            this.jobContext,
            this.argv.repositoryType
        );

        this.argv.repositoryType = repositoryDescription.getType();

        if (this.argv.repositoryIdentifier == null) {
            // select repository from configuration
            const existingConnectionConfigurations = getRepositoryConfigs(repositoryDescription.getType());

            if (existingConnectionConfigurations.length === 0) {
                this.jobContext.print(
                    "FAIL",
                    "There are no saved " +
                        repositoryDescription.getDisplayName() +
                        " repositories. Use the 'datapm repository add' command."
                );
                return {
                    exitCode: 1
                };
            }

            const connectionConfigurationResult = await this.jobContext.parameterPrompt([
                {
                    name: "connectionConfiguration",
                    type: ParameterType.AutoComplete,
                    message: "Repository to Update?",
                    options: existingConnectionConfigurations.map((c) => {
                        return { value: c, title: c.identifier };
                    }),
                    configuration: {}
                }
            ]);

            this.argv.repositoryIdentifier = connectionConfigurationResult.connectionConfiguration.identifier;
        }

        if (this.argv.repositoryIdentifier == null) {
            throw new Error("Repository identifier not provided.");
        }

        const repositoryConfig = getRepositoryConfigs(repositoryDescription.getType()).find(
            (c) => c.identifier === this.argv.repositoryIdentifier
        );

        if (repositoryConfig == null) {
            throw new Error("Repository configuration " + this.argv.repositoryIdentifier + " not found.");
        }

        const existingConnectionConfiguration = repositoryConfig.connectionConfiguration;

        const { connectionConfiguration: newConnectionConfiguration } = await promptForConnectionConfiguration(
            this.jobContext,
            repository,
            {},
            false,
            existingConnectionConfiguration
        );

        const newRepositoryIdentifier = await repository.getConnectionIdentifierFromConfiguration(
            newConnectionConfiguration
        );

        removeRepositoryConfig(this.argv.repositoryType, this.argv.repositoryIdentifier);

        saveRepositoryConfig(repositoryDescription.getType(), {
            identifier: newRepositoryIdentifier,
            connectionConfiguration: newConnectionConfiguration,
            credentials: repositoryConfig.credentials
        });

        // TODO: read and update all existing packages that use the old repository to the new one

        this.jobContext.print(
            "SUCCESS",
            "Updated " + this.argv.repositoryIdentifier + " to " + newRepositoryIdentifier
        );

        if (repository.requiresCredentialsConfiguration()) {
            this.jobContext.setCurrentStep("Repository Credentials");

            const credentialsResult = await obtainCredentialsConfiguration(
                this.jobContext,
                repository,
                newConnectionConfiguration,
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
                newConnectionConfiguration,
                credentialsConfiguration
            );
        }

        return {
            exitCode: 0
        };
    }
}
