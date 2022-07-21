import { ParameterType } from "datapm-lib";
import { getConnectorDescriptionByType, getConnectorDescriptions } from "../connector/ConnectorUtil";
import { promptForCredentials } from "../util/CredentialsUtil";
import { Job, JobResult } from "./Task";
import { JobContext } from "./JobContext";
import { PackageIdentifierInput } from "../main";

export class AddRepositoryCredentialsJobResult {}

export class CredentialsAddArguments {
    repositoryType?: string;
    repositoryIdentifier?: string;
    catalogSlug?: string;
    packageSlug?: string;
    defaults?: boolean | undefined;
}

export class AddRepositoryCredentialsJob extends Job<AddRepositoryCredentialsJobResult> {
    constructor(private jobContext: JobContext, private args: CredentialsAddArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<AddRepositoryCredentialsJobResult>> {
        this.jobContext.setCurrentStep("Adding Credentials");

        if (!this.args.repositoryType) {
            const repositoryTypeResult = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.AutoComplete,
                    name: "type",
                    message: "Repository Type?",
                    configuration: {},
                    options: getConnectorDescriptions()
                        .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()))
                        .map((s) => {
                            return { value: s.getType(), title: s.getDisplayName() };
                        })
                }
            ]);

            this.args.repositoryType = repositoryTypeResult.type;
        }

        if (this.args.repositoryType === undefined) {
            this.jobContext.print("ERROR", "Repository type " + this.args.repositoryType + " not provided.");
            return {
                exitCode: 1
            };
        }

        const connectorDescription = getConnectorDescriptionByType(this.args.repositoryType);

        if (connectorDescription === undefined) {
            throw new Error("Repository type " + this.args.repositoryType + " not found.");
        }

        const relatedPackage: PackageIdentifierInput | undefined =
            this.args.catalogSlug && this.args.packageSlug
                ? {
                      catalogSlug: this.args.catalogSlug,
                      packageSlug: this.args.packageSlug
                  }
                : undefined;

        const existingConfiguration = await this.jobContext.getRepositoryConfigsByType(
            relatedPackage,
            this.args.repositoryType
        );

        if (existingConfiguration.length === 0) {
            this.jobContext.print(
                "ERROR",
                "There are no saved configurations or credentials for " + this.args.repositoryType + " repositories"
            );
            return {
                exitCode: 1
            };
        }

        if (this.args.repositoryIdentifier == null) {
            const options: {
                value: string;
                title: string;
            }[] = [
                ...existingConfiguration.map((c) => {
                    return { value: c.identifier, title: c.identifier };
                })
            ];

            const existingConfigurationPromptResult = await this.jobContext.parameterPrompt([
                {
                    name: "connectionConfiguration",
                    type: ParameterType.AutoComplete,
                    message: "Repository?",
                    configuration: {},
                    options
                }
            ]);

            this.args.repositoryIdentifier = existingConfigurationPromptResult.connectionConfiguration;
        }

        if (this.args.repositoryIdentifier == null) {
            throw new Error("Repository identifier not provided.");
        }

        const repositoryConfig = existingConfiguration.find((c) => c.identifier === this.args.repositoryIdentifier);

        if (repositoryConfig === undefined) {
            throw new Error("Repository configuration for " + this.args.repositoryIdentifier + " not found.");
        }

        const repository = await connectorDescription.getConnector();

        if (!repository.requiresCredentialsConfiguration()) {
            this.jobContext.print(
                "WARN",
                "Repository type " + connectorDescription.getType() + " does not require credentials"
            );
            return {
                exitCode: 1
            };
        }

        this.jobContext.setCurrentStep("Repository Credentials");

        const credentialsResult = await promptForCredentials(
            this.jobContext,
            repository,
            repositoryConfig.connectionConfiguration,
            {},
            false,
            {}
        );

        const credentialsConfiguration = credentialsResult.credentialsConfiguration;

        const credentialsIdentifier = await repository.getCredentialsIdentifierFromConfiguration(
            repositoryConfig.connectionConfiguration,
            credentialsConfiguration
        );

        if (credentialsIdentifier != null) {
            const repositoryIdentifier = await repository.getRepositoryIdentifierFromConfiguration(
                repositoryConfig.connectionConfiguration
            );

            await this.jobContext.saveRepositoryCredential(
                undefined,
                repository.getType(),
                repositoryIdentifier,
                credentialsIdentifier,
                credentialsConfiguration
            );
        }

        this.jobContext.print(
            "SUCCESS",
            "Saved " +
                repository.getType() +
                " " +
                repositoryConfig.identifier +
                " credentials for " +
                credentialsIdentifier
        );

        return {
            exitCode: 0
        };
    }
}
