import chalk from "chalk";
import ora, { Ora } from "ora";
import prompts from "prompts";
import { DPMConfiguration } from "datapm-lib";
import { Repository, RepositoryDescription } from "../repository/Repository";
import { getRepositoryDescriptionByType, getRepositoryDescriptions } from "../repository/RepositoryUtil";
import {
    getRepositoryConfigs,
    removeCredentialsConfig,
    removeRepositoryConfig,
    saveRepositoryConfig,
    saveRepositoryCredential
} from "../util/ConfigUtil";
import { promptForConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration, promptForCredentials } from "../util/CredentialsUtil";
import { defaultPromptOptions } from "../util/parameters/DefaultParameterOptions";
import {
    Commands,
    CredentialsAddArguments,
    CredentialsRemoveArguments,
    RepositoryAddArguments,
    RepositoryDefaultArguments,
    RepositoryRemoveArguments,
    RepositoryUpdateArguments
} from "./RepositoryCommand";

export async function defaultRepositoryCommandHandler(argv: RepositoryDefaultArguments): Promise<void> {
    const commandPromptResult = await prompts({
        type: "autocomplete",
        name: "command",
        message: "Action?",
        choices: [
            { title: "Add a Repository or Credentials", value: Commands.ADD },
            { title: "Update a Repository", value: Commands.UPDATE },
            { title: "Remove a Repository", value: Commands.REMOVE },
            { title: "Update Credentials", value: Commands.UPDATE_CREDENTIALS },
            { title: "Remove Credentials", value: Commands.REMOVE_CREDENTIALS }
        ],
        initial: 0
    });

    if (commandPromptResult.command === Commands.ADD) {
        await addRepository(argv as RepositoryAddArguments);
    } else if (commandPromptResult.command === Commands.UPDATE) {
        await updateRepository(argv as RepositoryUpdateArguments);
    } else if (commandPromptResult.command === Commands.REMOVE) {
        await removeRepository(argv as RepositoryRemoveArguments);
    } else if (commandPromptResult.command === Commands.REMOVE_CREDENTIALS) {
        // await removeRegistryCommand(args as RegistryRemoveArguments);
    }
}

async function promptForRepositoryType(
    oraRef: Ora,
    repositoryType?: string
): Promise<{ repository: Repository; repositoryDescription: RepositoryDescription }> {
    if (!repositoryType) {
        const repositoryTypeResult = await prompts(
            {
                type: "autocomplete",
                name: "type",
                message: "Type?",
                choices: getRepositoryDescriptions()
                    .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()))
                    .map((s) => {
                        return { value: s.getType(), title: s.getDisplayName() };
                    })
            },
            defaultPromptOptions
        );

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
        oraRef.warn(repositoryDescription.getDisplayName() + " does not require connection configuration");
        process.exit(1);
    }

    if (!repository.userSelectableConnectionHistory()) {
        oraRef.warn(
            repositoryDescription.getDisplayName() + " does not support saving repository connection information"
        );
        process.exit(1);
    }

    return { repository, repositoryDescription };
}

export async function removeRepository(argv: RepositoryRemoveArguments): Promise<void> {
    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Starting...`
    });

    if (!argv.repositoryType) {
        console.log(chalk.magenta("Removing a Repository"));

        const repositoryTypeResult = await prompts(
            {
                type: "autocomplete",
                name: "type",
                message: "Type?",
                choices: getRepositoryDescriptions()
                    .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()))
                    .map((s) => {
                        return { value: s.getType(), title: s.getDisplayName() };
                    })
            },
            defaultPromptOptions
        );

        argv.repositoryType = repositoryTypeResult.type;
    } else {
        console.log(chalk.magenta("Removing a " + argv.repositoryType + " Repository"));
    }

    if (argv.repositoryType === undefined) {
        oraRef.fail("Repository type " + argv.repositoryType + " not found.");
        process.exit(1);
    }

    const existingConfiguration = getRepositoryConfigs(argv.repositoryType);

    if (existingConfiguration.length === 0) {
        oraRef.info("There are no saved configurations for " + argv.repositoryType + " repositories");
        process.exit(1);
    }

    if (argv.repositoryIdentifier == null) {
        const choices: {
            value: string;
            title: string;
        }[] = [
            ...existingConfiguration.map((c) => {
                return { value: c.identifier, title: c.identifier };
            })
        ];

        const existingConfigurationPromptResult = await prompts({
            name: "connectionConfiguration",
            type: "autocomplete",
            message: "Repository to Remove?",
            choices
        });

        argv.repositoryIdentifier = existingConfigurationPromptResult.connectionConfiguration;
    }

    if (argv.repositoryIdentifier == null) {
        throw new Error("Repository identifier not provided.");
    }

    removeRepositoryConfig(argv.repositoryType, argv.repositoryIdentifier);

    oraRef.succeed("The " + argv.repositoryType + " repository " + argv.repositoryIdentifier + " has been removed.");
}

export async function updateRepository(argv: RepositoryUpdateArguments): Promise<void> {
    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Starting...`
    });

    console.log(chalk.magenta("Update a Repository"));

    const { repository, repositoryDescription } = await promptForRepositoryType(oraRef, argv.repositoryType);

    argv.repositoryType = repositoryDescription.getType();

    if (argv.repositoryIdentifier == null) {
        // select repository from configuration
        const existingConnectionConfigurations = getRepositoryConfigs(repositoryDescription.getType());

        if (existingConnectionConfigurations.length === 0) {
            oraRef.fail(
                "There are no saved " +
                    repositoryDescription.getDisplayName() +
                    " repositories. Use the 'datapm repository add' command."
            );
            process.exit(1);
        }

        const connectionConfigurationResult = await prompts(
            [
                {
                    name: "connectionConfiguration",
                    type: "autocomplete",
                    message: "Repository to Update?",
                    choices: existingConnectionConfigurations.map((c) => {
                        return { value: c, title: c.identifier };
                    })
                }
            ],
            defaultPromptOptions
        );

        argv.repositoryIdentifier = connectionConfigurationResult.connectionConfiguration.identifier;
    }

    if (argv.repositoryIdentifier == null) {
        throw new Error("Repository identifier not provided.");
    }

    const repositoryConfig = getRepositoryConfigs(repositoryDescription.getType()).find(
        (c) => c.identifier === argv.repositoryIdentifier
    );

    if (repositoryConfig == null) {
        throw new Error("Repository configuration " + argv.repositoryIdentifier + " not found.");
    }

    const existingConnectionConfiguration = repositoryConfig.connectionConfiguration;

    const { connectionConfiguration: newConnectionConfiguration } = await promptForConnectionConfiguration(
        oraRef,
        repository,
        {},
        false,
        existingConnectionConfiguration
    );

    const newRepositoryIdentifier = await repository.getConnectionIdentifierFromConfiguration(
        newConnectionConfiguration
    );

    removeRepositoryConfig(argv.repositoryType, argv.repositoryIdentifier);

    saveRepositoryConfig(repositoryDescription.getType(), {
        identifier: newRepositoryIdentifier,
        connectionConfiguration: newConnectionConfiguration,
        credentials: repositoryConfig.credentials
    });

    // TODO: read and update all existing packages that use the old repository to the new one

    oraRef.succeed("Updated " + argv.repositoryIdentifier + " to " + newRepositoryIdentifier);

    if (repository.requiresCredentialsConfiguration()) {
        console.log("\n");
        console.log(chalk.magenta("Repository Credentials"));

        const credentialsResult = await obtainCredentialsConfiguration(
            oraRef,
            repository,
            newConnectionConfiguration,
            {},
            false,
            {}
        );

        if (credentialsResult === false) {
            defaultPromptOptions.onCancel();
            return;
        }

        const credentialsConfiguration = credentialsResult.credentialsConfiguration;

        await repository.getCredentialsIdentifierFromConfiguration(
            newConnectionConfiguration,
            credentialsConfiguration
        );

        console.log("\n");
        console.log(chalk.grey("Updated " + argv.repositoryIdentifier + " to " + newRepositoryIdentifier));
        console.log(chalk.green("datapm repository update " + repository.getType() + " " + newRepositoryIdentifier));
        console.log("\n");
    } else {
        console.log("\n");
        console.log(chalk.grey("Updated " + argv.repositoryIdentifier + " to " + newRepositoryIdentifier));
        console.log("\n");
    }
}

export async function addRepository(argv: RepositoryAddArguments): Promise<void> {
    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Starting...`
    });
    console.log(chalk.magenta("Adding a Repository"));

    const { repository, repositoryDescription } = await promptForRepositoryType(oraRef, argv.repositoryType);

    let connectionConfiguration: DPMConfiguration = {};

    console.log(chalk.magenta(repositoryDescription.getDisplayName() + " Connection Information"));

    const connectionConfigurationResponse = await promptForConnectionConfiguration(
        oraRef,
        repository,
        connectionConfiguration,
        false
    );

    connectionConfiguration = connectionConfigurationResponse.connectionConfiguration;

    const repositoryIdentifier = await repository.getConnectionIdentifierFromConfiguration(connectionConfiguration);

    oraRef.start("Saving connection configuration...");

    const existingRepsitoryConfig = getRepositoryConfigs(repositoryDescription.getType()).find(
        (c) => c.identifier === repositoryIdentifier
    );

    saveRepositoryConfig(repositoryDescription.getType(), {
        identifier: repositoryIdentifier,
        connectionConfiguration,
        credentials: existingRepsitoryConfig ? existingRepsitoryConfig.credentials : []
    });

    oraRef.succeed(
        "Saved " + repositoryDescription.getDisplayName() + " connection configuration for " + repositoryIdentifier
    );

    if (repository.requiresCredentialsConfiguration()) {
        console.log("\n");
        console.log(chalk.magenta(repositoryIdentifier + " Credentials"));

        const credentialsResult = await obtainCredentialsConfiguration(
            oraRef,
            repository,
            connectionConfiguration,
            {},
            false,
            {}
        );

        if (credentialsResult === false) {
            defaultPromptOptions.onCancel();
            return;
        }

        const credentialsConfiguration = credentialsResult.credentialsConfiguration;

        await repository.getCredentialsIdentifierFromConfiguration(connectionConfiguration, credentialsConfiguration);

        console.log("\n");
        console.log(chalk.grey("You can update this repository and credentials with the following command."));
        console.log(chalk.green("datapm repository update " + repository.getType() + " " + repositoryIdentifier));
        console.log("\n");
    } else {
        console.log("\n");
        console.log(chalk.grey("You can update this repository with the following command."));
        console.log(chalk.green("datapm repository update " + repository.getType() + " " + repositoryIdentifier));
        console.log("\n");
    }
}

export async function addCredentials(argv: CredentialsAddArguments): Promise<void> {
    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Starting...`
    });

    console.log(chalk.magenta("Adding Credentials"));

    if (!argv.repositoryType) {
        const repositoryTypeResult = await prompts(
            {
                type: "autocomplete",
                name: "type",
                message: "Repository Type?",
                choices: getRepositoryDescriptions()
                    .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()))
                    .map((s) => {
                        return { value: s.getType(), title: s.getDisplayName() };
                    })
            },
            defaultPromptOptions
        );

        argv.repositoryType = repositoryTypeResult.type;
    }

    if (argv.repositoryType === undefined) {
        oraRef.fail("Repository type " + argv.repositoryType + " not provided.");
        process.exit(1);
    }

    const repositoryDescription = getRepositoryDescriptionByType(argv.repositoryType);

    if (repositoryDescription === undefined) {
        throw new Error("Repository type " + argv.repositoryType + " not found.");
    }

    const existingConfiguration = getRepositoryConfigs(argv.repositoryType);

    if (existingConfiguration.length === 0) {
        oraRef.info("There are no saved configurations or credentials for " + argv.repositoryType + " repositories");
        process.exit(1);
    }

    if (argv.repositoryIdentifier == null) {
        const choices: {
            value: string;
            title: string;
        }[] = [
            ...existingConfiguration.map((c) => {
                return { value: c.identifier, title: c.identifier };
            })
        ];

        const existingConfigurationPromptResult = await prompts({
            name: "connectionConfiguration",
            type: "autocomplete",
            message: "Repository?",
            choices
        });

        argv.repositoryIdentifier = existingConfigurationPromptResult.connectionConfiguration;
    }

    if (argv.repositoryIdentifier == null) {
        throw new Error("Repository identifier not provided.");
    }

    const repositoryConfig = existingConfiguration.find((c) => c.identifier === argv.repositoryIdentifier);

    if (repositoryConfig === undefined) {
        throw new Error("Repository configuration for " + argv.repositoryIdentifier + " not found.");
    }

    const repository = await repositoryDescription.getRepository();

    if (!repository.requiresCredentialsConfiguration()) {
        console.log("Repository type " + repositoryDescription.getType() + " does not require credentials");
        process.exit(1);
    }

    console.log("\n");
    console.log(chalk.magenta("Repository Credentials"));

    const credentialsResult = await promptForCredentials(
        oraRef,
        repository,
        repositoryConfig.connectionConfiguration,
        {},
        false,
        {}
    );

    const credentialsConfiguration = credentialsResult.credentialsConfiguration;

    const credentialsIdentifier = await repository.getCredentialsIdentifierFromConfiguration(
        credentialsResult.credentialsConfiguration,
        credentialsConfiguration
    );

    const repositoryIdentifier = await repository.getConnectionIdentifierFromConfiguration(
        repositoryConfig.connectionConfiguration
    );

    saveRepositoryCredential(
        repository.getType(),
        repositoryIdentifier,
        credentialsIdentifier,
        credentialsConfiguration
    );

    oraRef.succeed(
        "Saved " +
            repository.getType() +
            " " +
            repositoryConfig.identifier +
            " credentials for " +
            credentialsIdentifier
    );
}

export async function removeCredentials(argv: CredentialsRemoveArguments): Promise<void> {
    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Starting...`
    });

    console.log(chalk.magenta("Removing Credentials"));

    if (!argv.repositoryType) {
        const repositoryTypeResult = await prompts(
            {
                type: "autocomplete",
                name: "type",
                message: "Repository Type?",
                choices: getRepositoryDescriptions()
                    .sort((a, b) => a.getDisplayName().localeCompare(b.getDisplayName()))
                    .map((s) => {
                        return { value: s.getType(), title: s.getDisplayName() };
                    })
            },
            defaultPromptOptions
        );

        argv.repositoryType = repositoryTypeResult.type;
    }

    if (argv.repositoryType === undefined) {
        oraRef.fail("Repository type " + argv.repositoryType + " not provided.");
        process.exit(1);
    }

    const repositoryDescription = getRepositoryDescriptionByType(argv.repositoryType);

    if (repositoryDescription === undefined) {
        throw new Error("Repository type " + argv.repositoryType + " not found.");
    }

    const existingConfiguration = getRepositoryConfigs(argv.repositoryType);

    if (existingConfiguration.length === 0) {
        oraRef.info("There are no saved configurations or credentials for " + argv.repositoryType + " repositories");
        process.exit(1);
    }

    if (argv.repositoryIdentifier == null) {
        const choices: {
            value: string;
            title: string;
        }[] = [
            ...existingConfiguration.map((c) => {
                return { value: c.identifier, title: c.identifier };
            })
        ];

        const existingConfigurationPromptResult = await prompts({
            name: "connectionConfiguration",
            type: "autocomplete",
            message: "Repository?",
            choices
        });

        argv.repositoryIdentifier = existingConfigurationPromptResult.connectionConfiguration;
    }

    if (argv.repositoryIdentifier == null) {
        throw new Error("Repository identifier not provided.");
    }

    const repositoryConfig = existingConfiguration.find((c) => c.identifier === argv.repositoryIdentifier);

    if (repositoryConfig === undefined) {
        throw new Error("Repository configuration for " + argv.repositoryIdentifier + " not found.");
    }

    if (repositoryConfig.credentials == null || repositoryConfig.credentials.length === 0) {
        oraRef.info("There are no saved credentials for " + argv.repositoryIdentifier + " repositories");
        return;
    }

    if (argv.credentialsIdentifier == null) {
        const credentialsResponse = await prompts({
            name: "credentials",
            type: "autocomplete",
            message: "Credential to Remove?",
            choices: repositoryConfig.credentials
                .map((c) => {
                    return { value: c.identifier, title: c.identifier };
                })
                .sort()
        });
        argv.credentialsIdentifier = credentialsResponse.credentials;
    }

    if (argv.credentialsIdentifier == null) {
        oraRef.info("Credential identifier not found.");
        return;
    }

    removeCredentialsConfig(argv.repositoryType, argv.repositoryIdentifier, argv.credentialsIdentifier);

    oraRef.succeed(
        "The " +
            argv.repositoryType +
            " repository " +
            argv.repositoryIdentifier +
            " credentials for " +
            argv.credentialsIdentifier +
            " has been removed."
    );
}
