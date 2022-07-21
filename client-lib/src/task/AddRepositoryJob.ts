import { DPMConfiguration, ParameterType } from "datapm-lib";
import { Connector, ConnectorDescription } from "../connector/Connector";
import { getConnectorDescriptionByType, getConnectorDescriptions } from "../connector/ConnectorUtil";
import { promptForConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration } from "../util/CredentialsUtil";
import { Job, JobResult } from "./Task";
import { JobContext } from "./JobContext";

export class AddRepositoryJobResult {
    connector: Connector;
    repositoryIdentifier: string;
}

export class RepositoryAddArguments {
    repositoryType?: string;
    catalogSlug?: string;
    packageSlug?: string;
    default?: boolean | undefined;
    quiet?: boolean | undefined;
}

export class AddRepositoryJob extends Job<AddRepositoryJobResult> {
    constructor(private jobContext: JobContext, private argv: RepositoryAddArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<AddRepositoryJobResult>> {
        this.jobContext.setCurrentStep("Adding a Repository");

        const { connector, connectorDescription } = await promptForRepositoryType(
            this.jobContext,
            this.argv.repositoryType
        );

        let connectionConfiguration: DPMConfiguration = {};

        this.jobContext.setCurrentStep(connectorDescription.getDisplayName() + " Connection Information");

        const connectionConfigurationResponse = await promptForConnectionConfiguration(
            this.jobContext,
            connector,
            connectionConfiguration,
            false
        );

        connectionConfiguration = connectionConfigurationResponse.connectionConfiguration;

        const repositoryIdentifier = await connector.getRepositoryIdentifierFromConfiguration(connectionConfiguration);

        const task = await this.jobContext.startTask("Saving connection configuration...");

        const existingRepsitoryConfig = await this.jobContext.getRepositoryConfig(
            this.argv.catalogSlug && this.argv.packageSlug
                ? { catalogSlug: this.argv.catalogSlug, packageSlug: this.argv.packageSlug }
                : undefined,
            connectorDescription.getType(),
            repositoryIdentifier
        );

        this.jobContext.saveRepositoryConfig(undefined, connectorDescription.getType(), {
            identifier: repositoryIdentifier,
            connectionConfiguration,
            credentials: existingRepsitoryConfig ? existingRepsitoryConfig.credentials : []
        });

        await task.end(
            "SUCCESS",
            "Saved " + connectorDescription.getDisplayName() + " connection configuration for " + repositoryIdentifier
        );

        if (connector.requiresCredentialsConfiguration()) {
            const credentialsResult = await obtainCredentialsConfiguration(
                this.jobContext,
                undefined,
                connector,
                connectionConfiguration,
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

            this.jobContext.print(
                "INFO",
                "Saved " + credentialsResult.credentialsIdentifier + " credentials for " + repositoryIdentifier
            );
        }

        return {
            exitCode: 0,
            result: {
                connector,
                repositoryIdentifier
            }
        };
    }
}

export async function promptForRepositoryType(
    jobContext: JobContext,
    connectorType?: string
): Promise<{ connector: Connector; connectorDescription: ConnectorDescription }> {
    if (!connectorType) {
        const connectorTypeResult = await jobContext.parameterPrompt([
            {
                type: ParameterType.AutoComplete,
                name: "type",
                message: "Type?",
                configuration: {},
                options: getConnectorDescriptions()
                    .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()))
                    .map((s) => {
                        return { value: s.getType(), title: s.getDisplayName() };
                    })
            }
        ]);

        connectorType = connectorTypeResult.type;
    }

    if (connectorType == null) {
        throw new Error("Connector type is required.");
    }

    const maybeConnectorDescription = getConnectorDescriptionByType(connectorType);

    if (maybeConnectorDescription == null) {
        throw new Error(`Unknown repository type: ${connectorType}`);
    }

    const connectorDescription = maybeConnectorDescription;

    const connector = await connectorDescription.getConnector();

    if (!connector.requiresConnectionConfiguration()) {
        jobContext.print("WARN", connectorDescription.getDisplayName() + " does not require connection configuration");
        throw new Error("CANCELLED");
    }

    if (!connector.userSelectableConnectionHistory()) {
        jobContext.print(
            "WARN",
            connectorDescription.getDisplayName() + " does not support saving repository connection information"
        );
        throw new Error("CANCELLED");
    }

    return { connector, connectorDescription };
}
