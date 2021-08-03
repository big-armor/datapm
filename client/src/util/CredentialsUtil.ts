import { Ora } from "ora";
import prompts from "prompts";
import { DPMConfiguration } from "datapm-lib";
import { Repository } from "../repository/Repository";
import {
    getRepositoryConfigs,
    getRepositoryCredential,
    saveRepositoryConfig,
    saveRepositoryCredential
} from "./ConfigUtil";
import { repeatedlyPromptParameters } from "./parameters/ParameterUtils";

/** Given a repository and a potentially preconfigured connection and credentials configuration pair,
 * prompt the user for information necessary to successfully authenticate. Then save the credentials
 * to the local configuration object */
export async function obtainCredentialsConfiguration(
    oraRef: Ora,
    repository: Repository,
    connectionConfiguration: DPMConfiguration,
    credentialsConfiguration: DPMConfiguration,
    defaults: boolean | undefined
): Promise<DPMConfiguration | false> {
    if (!repository.requiresCredentialsConfiguration()) {
        return credentialsConfiguration;
    }

    const repositoryIdentifier = await repository.getConnectionIdentifierFromConfiguration(connectionConfiguration);

    const repositoryConfig = getRepositoryConfigs(repository.getType()).find(
        (c) => c.identifier === repositoryIdentifier
    );

    const pendingParameters = await repository.getCredentialsParameters(
        connectionConfiguration,
        credentialsConfiguration
    );

    if (
        Object.keys(credentialsConfiguration).length === 0 &&
        pendingParameters.length > 0 &&
        repositoryConfig != null &&
        repositoryConfig.crdentials &&
        repositoryConfig.crdentials.length > 0
    ) {
        const choices: {
            value: string | null;
            title: string;
        }[] = [
            { value: "**NEW**", title: "Add or Update Credentials" },
            ...repositoryConfig.crdentials.map((c) => {
                return { value: c.identifier, title: c.identifier };
            })
        ];

        const credentialsPromptResult = await prompts({
            name: "credentialsIdentifier",
            type: "autocomplete",
            message: "Credentials?",
            choices
        });

        if (credentialsPromptResult.credentialsIdentifier == null) {
            return false;
        }

        if (credentialsPromptResult.credentialsIdentifier !== "**NEW**") {
            try {
                credentialsConfiguration = await getRepositoryCredential(
                    repository.getType(),
                    repositoryIdentifier,
                    credentialsPromptResult.credentialsIdentifier
                );
            } catch (error) {
                oraRef.warn(
                    `There was an error reading the credentials. It is likely the credentials were encrypted with a key other than the one found on the keychain. This means you will need to re-enter the credentials. Choose 'Add or Update Credentials' and re-enter them.`
                );
            }
        }
    }

    let credentialsSuccess = false;

    while (!credentialsSuccess) {
        await repeatedlyPromptParameters(
            async () => {
                return repository.getCredentialsParameters(connectionConfiguration, credentialsConfiguration);
            },
            credentialsConfiguration,
            defaults || false
        );

        const credentialsTestResult = await repository.testCredentials(
            connectionConfiguration,
            credentialsConfiguration
        );

        if (typeof credentialsTestResult === "string") {
            oraRef.fail("Authentication failed: " + credentialsTestResult);
            credentialsConfiguration = {};
            continue;
        } else {
            credentialsSuccess = true;
        }
    }

    if (Object.keys(credentialsConfiguration).length > 0) {
        const credentialsIdentifier = await repository.getCredentialsIdentifierFromConfiguration(
            connectionConfiguration,
            credentialsConfiguration
        );

        saveRepositoryConfig(repository.getType(), repositoryIdentifier, connectionConfiguration);

        await saveRepositoryCredential(
            repository.getType(),
            repositoryIdentifier,
            credentialsIdentifier,
            credentialsConfiguration
        );
    }

    return credentialsConfiguration;
}
