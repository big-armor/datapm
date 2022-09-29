import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import {
    getConnectorDescriptionByType,
    getConnectorDescriptions,
    CredentialsAddArguments,
    RepositoryAddArguments,
    RepositoryUpdateArguments,
    AddRepositoryJob,
    UpdateRepositoryJob,
    AddRepositoryCredentialsJob
} from "datapm-client-lib";
import { getRepositoryConfigs, removeCredentialsConfig, removeRepositoryConfig } from "../util/ConfigUtil";
import {
    Commands,
    CredentialDefaultArguments,
    CredentialsRemoveArguments,
    RepositoryDefaultArguments,
    RepositoryRemoveArguments
} from "./RepositoryCommand";

import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { CLIJobContext } from "./CommandTaskUtil";

import { defaultPromptOptions } from "../util/DefaultParameterOptions";

export async function defaultCredentialCommandHandler(argv: CredentialDefaultArguments): Promise<void> {
    printDataPMVersion(argv);

    const commandPromptResult = await prompts({
        type: "autocomplete",
        name: "command",
        message: "Action?",
        choices: [
            { title: "Add Credentials", value: Commands.ADD_CREDENTIALS },
            { title: "Remove Credentials", value: Commands.REMOVE_CREDENTIALS }
        ],
        initial: 0
    });

    if (commandPromptResult.command === Commands.REMOVE_CREDENTIALS) {
        await removeCredentials(argv as CredentialsRemoveArguments);
    } else if (commandPromptResult.command === Commands.ADD_CREDENTIALS) {
        await addCredentials(argv as CredentialsAddArguments);
    }
}

export async function defaultRepositoryCommandHandler(argv: RepositoryDefaultArguments): Promise<void> {
    printDataPMVersion(argv);

    const commandPromptResult = await prompts({
        type: "autocomplete",
        name: "command",
        message: "Action?",
        choices: [
            { title: "Add a Repository", value: Commands.ADD },
            { title: "Update a Repository", value: Commands.UPDATE },
            { title: "Remove a Repository", value: Commands.REMOVE },
            { title: "Add Credentials", value: Commands.ADD_CREDENTIALS },
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
        await removeCredentials(argv as CredentialsRemoveArguments);
    } else if (commandPromptResult.command === Commands.ADD_CREDENTIALS) {
        await addCredentials(argv as CredentialsAddArguments);
    }
}

export async function removeRepository(argv: RepositoryRemoveArguments): Promise<void> {
    printDataPMVersion(argv);

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
                choices: getConnectorDescriptions()
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
            message: "Repository to remove?",
            choices
        });

        argv.repositoryIdentifier = existingConfigurationPromptResult.connectionConfiguration;
    }

    if (argv.repositoryIdentifier == null) {
        throw new Error("Repository identifier not provided.");
    }

    removeRepositoryConfig(argv.repositoryType, argv.repositoryIdentifier);

    oraRef.succeed("The " + argv.repositoryType + " repository " + argv.repositoryIdentifier + " has been removed.");
    process.exit(0);
}

export async function updateRepository(argv: RepositoryUpdateArguments): Promise<void> {
    printDataPMVersion(argv);

    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Starting...`
    });

    const jobContext = new CLIJobContext(oraRef, argv);

    const job = new UpdateRepositoryJob(jobContext, argv);

    const result = await job.execute();

    if (result.exitCode !== 0) {
        oraRef.fail(result.errorMessage);
        process.exit(result.exitCode);
    }

    console.log("\n");
    console.log(chalk.grey("Updated " + argv.repositoryIdentifier + " to " + result.result?.newRepositoryIdentifier));
    console.log(
        chalk.green(
            "datapm repository update " +
                result.result?.connector.getType() +
                " " +
                result.result?.newRepositoryIdentifier
        )
    );
    console.log("\n");
}

export async function addRepository(argv: RepositoryAddArguments): Promise<void> {
    printDataPMVersion(argv);

    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Starting...`
    });

    const jobContext = new CLIJobContext(oraRef, argv);

    const job = new AddRepositoryJob(jobContext, argv);

    const result = await job.execute();

    if (result.exitCode !== 0) {
        oraRef.fail(result.errorMessage);
        process.exit(result.exitCode);
    }

    console.log("\n");
    console.log(chalk.grey("You can update this repository with the following command."));
    console.log(
        chalk.green(
            "datapm repository update " + result.result?.connector.getType() + " " + result.result?.repositoryIdentifier
        )
    );
    console.log("\n");

    process.exit(0);
}

export async function addCredentials(argv: CredentialsAddArguments): Promise<void> {
    printDataPMVersion(argv);

    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Starting...`
    });

    const jobContext = new CLIJobContext(oraRef, argv);

    const job = new AddRepositoryCredentialsJob(jobContext, argv);

    try {
        const result = await job.execute();

        if (result.exitCode !== 0) {
            oraRef.fail(result.errorMessage);
            process.exit(result.exitCode);
        }

        process.exit(0);
    } catch (error) {
        console.log(chalk.red(error.message));
        process.exit(1);
    }
}

export async function removeCredentials(argv: CredentialsRemoveArguments): Promise<void> {
    printDataPMVersion(argv);

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
                choices: getConnectorDescriptions()
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

    const connectorDescription = getConnectorDescriptionByType(argv.repositoryType);

    if (connectorDescription === undefined) {
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

    process.exit(0);
}
