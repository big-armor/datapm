import { DPMConfiguration, ParameterOption, ParameterType, Source } from "datapm-lib";
import { Connector } from "../connector/Connector";
import { repeatedlyPromptParameters } from "./parameters/ParameterUtils";
import { getConnectorDescriptionByType } from "../connector/ConnectorUtil";
import { JobContext } from "../task/Task";

export async function obtainCredentials(jobContext: JobContext, source: Source): Promise<DPMConfiguration> {
    const connectorDescription = getConnectorDescriptionByType(source.type);

    if (connectorDescription === undefined) {
        throw new Error(`Could not find repository description for type ${source.type}`);
    }
    const repository = await connectorDescription?.getRepository();

    if (repository === undefined) {
        throw new Error(`Could not find repository implementation for type ${source.type}`);
    }

    /* const connectionIdentifier = await repository.getConnectionIdentifierFromConfiguration(
        source.connectionConfiguration
    );

    // console.log(`For the ${connectorDescription.getDisplayName()} repository ${connectionIdentifier}`);
        */
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
    defaults: boolean | undefined,
    overrideDefaultValues: DPMConfiguration = {}
): Promise<{ credentialsConfiguration: DPMConfiguration; parameterCount: number } | false> {
    if (!connector.requiresCredentialsConfiguration()) {
        return { credentialsConfiguration, parameterCount: 0 };
    }

    const repositoryIdentifier = await connector.getRepositoryIdentifierFromConfiguration(connectionConfiguration);

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

    const pendingParameters = await connector.getCredentialsParameters(
        connectionConfiguration,
        credentialsConfiguration
    );

    if (
        Object.keys(credentialsConfiguration).length === 0 &&
        pendingParameters.length > 0 &&
        repositoryConfig.credentials &&
        repositoryConfig.credentials.length > 0
    ) {
        const options:ParameterOption[] = [
            ...repositoryConfig.credentials.map((c) => {
                return { value: c.identifier, title: c.identifier };
            }),
            { value: "**NEW**", title: "Add Credentials" },
            { value: "**EXIT**", title: "Don't add or update credentials", disabled: !allowDontSelect},

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

    if (Object.keys(credentialsConfiguration).length > 0) {
        const credentialsIdentifier = await connector.getCredentialsIdentifierFromConfiguration(
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

    return { credentialsConfiguration, parameterCount: credentialsPromptResponse.parameterCount };
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
                return connector.getCredentialsParameters(connectionConfiguration, credentialsConfiguration);
            },
            defaults || false,
            overrideDefaultValues
        );

        const credentialsTestResult = await connector.testCredentials(
            connectionConfiguration,
            credentialsConfiguration
        );

        if (typeof credentialsTestResult === "string") {
            jobContext.print("FAIL", "Authentication failed: " + credentialsTestResult);
            credentialsConfiguration = {};
            continue;
        } else {
            credentialsSuccess = true;
        }
    }

    return {
        credentialsConfiguration,
        parameterCount
    };
}
