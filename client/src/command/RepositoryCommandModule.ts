import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import { DPMConfiguration } from "../../../lib/dist/src/PackageUtil";
import { getRepositoryDescriptionByType, getRepositoryDescriptions } from "../repository/RepositoryUtil";
import { getRepositoryConfigs, removeRepositoryConfig, saveRepositoryConfig } from "../util/ConfigUtil";
import { obtainConnectionConfiguration } from "../util/ConnectionUtil";
import { obtainCredentialsConfiguration } from "../util/CredentialsUtil";
import { defaultPromptOptions } from "../util/parameters/DefaultParameterOptions";
import {
    Commands,
    RepositoryAddArguments,
    RepositoryDefaultArguments,
    RepositoryRemoveArguments
} from "./RepositoryCommand";

export async function defaultRepositoryCommandHandler(argv: RepositoryDefaultArguments): Promise<void> {
    const commandPromptResult = await prompts({
        type: "autocomplete",
        name: "command",
        message: "What action would you like to take?",
        choices: [
            { title: "Add A Repository", value: Commands.ADD },
            { title: "Remove A Repository", value: Commands.REMOVE },
            { title: "Update A Repository", value: Commands.UPDATE },
            { title: "Add Repository Credentials", value: Commands.ADD_CREDENTIALS },
            { title: "Update Repository Credentials", value: Commands.UPDATE_CREDENTIALS },
            { title: "Remove Repository Credentials", value: Commands.REMOVE_CREDENTIALS }
        ],
        initial: 0
    });

    if (commandPromptResult.command === Commands.ADD) {
        await addRepository(argv as RepositoryAddArguments);
    } else if (commandPromptResult.command === Commands.UPDATE) {
        // await logoutFromRegistry(args as RepositoryUpdateArguments);
    } else if (commandPromptResult.command === Commands.REMOVE) {
        await removeRepository(argv as RepositoryRemoveArguments);
    } else if (commandPromptResult.command === Commands.ADD_CREDENTIALS) {
        // await removeRegistryCommand(args as RegistryRemoveArguments);
    } else if (commandPromptResult.command === Commands.UPDATE_CREDENTIALS) {
        // await removeRegistryCommand(args as RegistryRemoveArguments);
    } else if (commandPromptResult.command === Commands.REMOVE_CREDENTIALS) {
        // await removeRegistryCommand(args as RegistryRemoveArguments);
    }
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
            message: "Repository?",
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

export async function addRepository(argv: RepositoryAddArguments): Promise<void> {
    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Starting...`
    });

    if (!argv.repositoryType) {
        console.log(chalk.magenta("Adding a Repository"));

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
        console.log(chalk.magenta("Adding a " + argv.repositoryType + " Repository"));
    }

    if (argv.repositoryType == null) {
        throw new Error("Repository type is required.");
    }

    const maybeRepositoryDescription = getRepositoryDescriptionByType(argv.repositoryType);

    if (maybeRepositoryDescription == null) {
        throw new Error(`Unknown repository type: ${argv.repositoryType}`);
    }

    const repositoryDescription = maybeRepositoryDescription;

    const repository = await repositoryDescription.getRepository();

    let connectionConfiguration: DPMConfiguration = {};

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

    const connectionConfigurationResponse = await obtainConnectionConfiguration(
        oraRef,
        repository,
        connectionConfiguration,
        false
    );

    if (connectionConfigurationResponse === false) {
        defaultPromptOptions.onCancel();
        return;
    }

    connectionConfiguration = connectionConfigurationResponse.connectionConfiguration;

    const repositoryIdentifier = await repository.getConnectionIdentifierFromConfiguration(connectionConfiguration);

    oraRef.start("Saving connection configuration...");
    saveRepositoryConfig(repositoryDescription.getType(), repositoryIdentifier, connectionConfiguration);
    oraRef.succeed(
        "Saved " + repositoryDescription.getDisplayName() + " connection configuration for " + repositoryIdentifier
    );

    if (repository.requiresCredentialsConfiguration()) {
        console.log("\n");
        console.log(chalk.magenta("Repository Credentials"));

        const credentialsResult = await obtainCredentialsConfiguration(
            oraRef,
            repository,
            connectionConfiguration,
            {},
            false
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
        console.log("\n");
    }
}
