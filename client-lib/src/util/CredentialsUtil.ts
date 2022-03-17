import { DPMConfiguration, ParameterOption, ParameterType, Source } from "datapm-lib";
import { Connector } from "../connector/Connector";
import { repeatedlyPromptParameters } from "./parameters/ParameterUtils";
import { getConnectorDescriptionByType } from "../connector/ConnectorUtil";
import { JobContext } from "../task/Task";

/** Requests from the user credentials for each source - without saving those credentials to any configuration file */
export async function obtainCredentials(jobContext: JobContext, source: Source): Promise<DPMConfiguration> {
    const connectorDescription = getConnectorDescriptionByType(source.type);

    if (connectorDescription === undefined) {
        throw new Error(`Could not find repository description for type ${source.type}`);
    }
    const repository = await connectorDescription?.getConnector();

    if (repository === undefined) {
        throw new Error(`Could not find repository implementation for type ${source.type}`);
    }

    const connectionIdentifier = await repository.getRepositoryIdentifierFromConfiguration(
        source.connectionConfiguration
    );

    console.log(`For the ${connectorDescription.getDisplayName()} repository ${connectionIdentifier}`);

    const credentialsPromptResponse = await promptForCredentials(
        jobContext,
        repository,
        source.connectionConfiguration,
        {},
        false,
        {}
    );

    return credentialsPromptResponse.credentialsConfiguration;
}

/** Given a repository and a potentially preconfigured connection and credentials configuration pair,
 * prompt the user for information necessary to successfully authenticate. Then save the credentials
 * to the local configuration object */
export async function obtainCredentialsConfiguration(
    jobContext: JobContext,
    connector: Connector,
    connectionConfiguration: DPMConfiguration,
    credentialsConfiguration: DPMConfiguration,
    allowDontSelect: boolean,
    credentialsIdentifier: string | undefined,
    defaults: boolean | undefined,
    overrideDefaultValues: DPMConfiguration = {}
): Promise<
    | { credentialsIdentifier: string | undefined; credentialsConfiguration: DPMConfiguration; parameterCount: number }
    | false
> {
    if (!connector.requiresCredentialsConfiguration()) {
        return { credentialsIdentifier: undefined, credentialsConfiguration, parameterCount: 0 };
    }

    const connectorDescription = getConnectorDescriptionByType(connector.getType());

    jobContext.setCurrentStep(connectorDescription?.getDisplayName() + " Credentials");

    const repositoryIdentifier = await connector.getRepositoryIdentifierFromConfiguration(connectionConfiguration);

    if (repositoryIdentifier == null) throw new Error("Could not find repository identifier");

    let repositoryConfig = jobContext
        .getRepositoryConfigsByType(connector.getType())
        .find((c) => c.identifier === repositoryIdentifier);

    if (repositoryConfig == null) {
        repositoryConfig = {
            identifier: repositoryIdentifier,
            connectionConfiguration,
            credentials: []
        };
    }

    let parameterCount = 0;

    if (credentialsIdentifier != null) {
        const savedCredentials = await jobContext.getRepositoryCredential(
            connector.getType(),
            repositoryIdentifier,
            credentialsIdentifier
        );

        // purposefully prioritized the credentialsConfiguration over the savedCredentials
        credentialsConfiguration = { ...savedCredentials, ...credentialsConfiguration };

        jobContext.print("INFO", "Using saved credentials for " + credentialsIdentifier);
    }

    const pendingParameters = await connector.getCredentialsParameters(
        connectionConfiguration,
        credentialsConfiguration,
        {...jobContext,
            print:(...args) => {}, // Eat these because we're about to do it for real in a moment
            log:(...args) => {},
        }
    );

    if (
        !credentialsIdentifier &&
        Object.keys(credentialsConfiguration).length === 0 &&
        pendingParameters.length > 0 &&
        repositoryConfig.credentials &&
        repositoryConfig.credentials.length > 0
    ) {
        parameterCount++;

        const options: ParameterOption[] = [
            ...repositoryConfig.credentials.map((c) => {
                return { value: c.identifier, title: c.identifier };
            }),
            { value: "**NEW**", title: "Add Credentials" },
            { value: "**EXIT**", title: "Don't add or update credentials", disabled: !allowDontSelect }
        ];

        const credentialsPromptResult = await jobContext.parameterPrompt([
            {
                name: "credentialsIdentifier",
                type: ParameterType.AutoComplete,
                message: "Credentials?",
                options,
                configuration: {}
            }
        ]);

        if (credentialsPromptResult.credentialsIdentifier == null) {
            return false;
        }

        if (credentialsPromptResult.credentialsIdentifier === "**EXIT**") {
            return false;
        }

        if (credentialsPromptResult.credentialsIdentifier !== "**NEW**") {
            try {
                credentialsConfiguration = await jobContext.getRepositoryCredential(
                    connector.getType(),
                    repositoryIdentifier,
                    credentialsPromptResult.credentialsIdentifier
                );
            } catch (error) {
                jobContext.print(
                    "WARN",
                    `There was an error reading the credentials. It is likely the credentials were encrypted with a key other than the one found on the keychain. This means you will need to re-enter the credentials. Choose 'Add or Update Credentials' and re-enter them.`
                );
            }
        }
    }

    const credentialsPromptResponse = await promptForCredentials(
        jobContext,
        connector,
        connectionConfiguration,
        credentialsConfiguration,
        defaults || false,
        overrideDefaultValues
    );

    parameterCount += credentialsPromptResponse.parameterCount;

    if (Object.keys(credentialsConfiguration).length > 0) {
        credentialsIdentifier = await connector.getCredentialsIdentifierFromConfiguration(
            connectionConfiguration,
            credentialsConfiguration
        );

        jobContext.saveRepositoryConfig(connector.getType(), repositoryConfig);

        await jobContext.saveRepositoryCredential(
            connector.getType(),
            repositoryIdentifier,
            credentialsIdentifier,
            credentialsConfiguration
        );
    }

    return { credentialsIdentifier, credentialsConfiguration, parameterCount };
}

export async function promptForCredentials(
    jobContext: JobContext,
    connector: Connector,
    connectionConfiguration: DPMConfiguration,
    credentialsConfiguration: DPMConfiguration,
    defaults: boolean,
    overrideDefaultValues: DPMConfiguration
): Promise<{ credentialsConfiguration: DPMConfiguration; parameterCount: number }> {
    let credentialsSuccess = false;
    let parameterCount = 0;
    while (!credentialsSuccess) {
        parameterCount += await repeatedlyPromptParameters(
            jobContext,
            async () => {
                return connector.getCredentialsParameters(connectionConfiguration, credentialsConfiguration, jobContext);
            },
            defaults || false,
            overrideDefaultValues
        );

        const task = await jobContext.startTask("Testing Credentials");

        const credentialsTestResult = await connector.testCredentials(
            connectionConfiguration,
            credentialsConfiguration
        );

        if (typeof credentialsTestResult === "string") {
            task.end("ERROR", "Authentication failed: " + credentialsTestResult);
            credentialsConfiguration = {};
            continue;
        } else {
            credentialsSuccess = true;
        }

        task.end("SUCCESS", "Authentication succeeded");
    }

    return {
        credentialsConfiguration,
        parameterCount
    };
}
