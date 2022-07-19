import { ParameterType } from "datapm-lib";
import { Connector } from "../connector/Connector";
import { promptForConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration } from "../util/CredentialsUtil";
import { promptForRepositoryType } from "./AddRepositoryJob";
import { Job, JobResult } from "./Task";
import { JobContext } from "./JobContext";

export class UpdateRepositoryJobResult {
    connector: Connector;
    newRepositoryIdentifier: string;
}
export class RepositoryUpdateArguments {
    repositoryType?: string;
    repositoryIdentifier?: string;
    default?: boolean | undefined;
    quiet?: boolean | undefined;
}

export class UpdateRepositoryJob extends Job<UpdateRepositoryJobResult> {
    constructor(private jobContext: JobContext, private argv: RepositoryUpdateArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<UpdateRepositoryJobResult>> {
        this.jobContext.setCurrentStep("Update a Repository");

        const { connector, connectorDescription } = await promptForRepositoryType(
            this.jobContext,
            this.argv.repositoryType
        );

        this.argv.repositoryType = connectorDescription.getType();

        if (this.argv.repositoryIdentifier == null) {
            // select repository from configuration
            const existingConnectionConfigurations = await this.jobContext.getRepositoryConfigsByType(
                undefined,
                connectorDescription.getType()
            );

            if (existingConnectionConfigurations.length === 0) {
                this.jobContext.print(
                    "FAIL",
                    "There are no saved " +
                        connectorDescription.getDisplayName() +
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

        const repositoryConfig = await this.jobContext.getRepositoryConfig(
            undefined,
            connectorDescription.getType(),
            this.argv.repositoryIdentifier
        );

        if (repositoryConfig == null) {
            throw new Error("Repository configuration " + this.argv.repositoryIdentifier + " not found.");
        }

        const existingConnectionConfiguration = repositoryConfig.connectionConfiguration;

        const { connectionConfiguration: newConnectionConfiguration } = await promptForConnectionConfiguration(
            this.jobContext,
            connector,
            {},
            false,
            existingConnectionConfiguration
        );

        const newRepositoryIdentifier = await connector.getRepositoryIdentifierFromConfiguration(
            newConnectionConfiguration
        );

        this.jobContext.removeRepositoryConfig(undefined, this.argv.repositoryType, this.argv.repositoryIdentifier);

        this.jobContext.saveRepositoryConfig(undefined, connectorDescription.getType(), {
            identifier: newRepositoryIdentifier,
            connectionConfiguration: newConnectionConfiguration,
            credentials: repositoryConfig.credentials
        });

        // TODO: read and update all existing packages that use the old repository to the new one

        this.jobContext.print(
            "SUCCESS",
            "Updated " + this.argv.repositoryIdentifier + " to " + newRepositoryIdentifier
        );

        if (connector.requiresCredentialsConfiguration()) {
            this.jobContext.setCurrentStep("Repository Credentials");

            const credentialsResult = await obtainCredentialsConfiguration(
                this.jobContext,
                undefined,
                connector,
                newConnectionConfiguration,
                {},
                true,
                undefined,
                false,
                {}
            );

            if (credentialsResult === false) {
                return {
                    exitCode: 1
                };
            }

            const credentialsConfiguration = credentialsResult.credentialsConfiguration;

            await connector.getCredentialsIdentifierFromConfiguration(
                newConnectionConfiguration,
                credentialsConfiguration
            );
        }

        return {
            exitCode: 0
        };
    }
}
