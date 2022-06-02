import ora from "ora";
import prompts from "prompts";
import { Argv } from "yargs";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { checkDataPMVersion } from "../util/VersionCheckUtil";
import { Command } from "./Command";
import { editPackage } from "./EditCommandModule";
import { fetchPackage } from "./FetchCommand";
import { handleInfo } from "./InfoCommand";
import { packageCommand } from "./PackageCommand";
import { publishPackage } from "./PublishPackageCommand";
import { authenticateToRegistry, defaultRegistryCommand, logoutFromRegistry } from "./RegistryCommand";
import { addRepository, removeRepository } from "./RepositoryCommand";
import { handleSearch } from "./SearchCommand";
import { updateCommandHandler } from "./UpdateCommand";

const enum Commands {
    FETCH = "Fetch",
    SEARCH = "Search",
    PACKAGE = "Package",
    UPDATE = "Update",
    LOGIN = "Login",
    LOGOUT = "Logout",
    ADD_REPOSITORY = "AddRepository",
    REMOVE_REPOSITORY = "RemoveRepository",
    PUBLISH = "Publish",
    EDIT = "Edit"
}

export class Arguments {
    defaults?: boolean;
    quiet?: boolean;
}

export class FallbackCommand implements Command {
    prepareCommand(argv: Argv<Arguments>): Argv {
        return argv.command({
            command: "*",
            describe: "DataPM Actions",
            builder: (yargs) => {
                return yargs
                    .command({
                        command: "fetch",
                        describe: "Fetch data",
                        handler: fetchPackage
                    })
                    .command({
                        command: "search",
                        describe: "Search for data",
                        handler: handleSearch
                    })
                    .command({
                        command: "info",
                        describe: "Get package info",
                        handler: handleInfo
                    })
                    .command({
                        command: "package",
                        describe: "Package data",
                        handler: packageCommand
                    })
                    .command({
                        command: "update",
                        describe: "Update package",
                        handler: updateCommandHandler
                    })
                    .command({
                        command: "registry",
                        describe: "registry actions",
                        handler: defaultRegistryCommand
                    })
                    .command({
                        command: "repository",
                        describe: "repository actions",
                        handler: defaultRegistryCommand
                    });
            },
            handler: async (innerArgv) => {
                printDataPMVersion(argv);

                if (innerArgv.version != null) {
                    if (!argv.argv.quiet) {
                        const oraRef: ora.Ora = ora({
                            color: "yellow",
                            spinner: "dots"
                        });
                        await checkDataPMVersion(oraRef);
                    }

                    process.exit(0);
                }

                const commandPromptResult = await prompts({
                    type: "autocomplete",
                    name: "command",
                    message: "What action would you like to take?",
                    choices: [
                        { title: "Fetch data", value: Commands.FETCH },
                        { title: "Search for data", value: Commands.SEARCH },
                        { title: "Create new package and publish", value: Commands.PACKAGE },
                        { title: "Pubish existing package", value: Commands.PUBLISH },
                        { title: "Update a package's stats", value: Commands.UPDATE },
                        { title: "Edit a package's descriptions", value: Commands.EDIT },
                        { title: "Log into a registry", value: Commands.LOGIN },
                        { title: "Log out of a registry", value: Commands.LOGOUT },
                        { title: "Add or Update a data repository", value: Commands.ADD_REPOSITORY },
                        { title: "Remove a data repository", value: Commands.REMOVE_REPOSITORY }
                    ],
                    initial: 0
                });

                if (commandPromptResult.command === Commands.FETCH) {
                    await this.runFetchCommand();
                } else if (commandPromptResult.command === Commands.SEARCH) {
                    await this.runSearchCommand();
                } else if (commandPromptResult.command === Commands.PACKAGE) {
                    await this.runPackageCommand();
                } else if (commandPromptResult.command === Commands.UPDATE) {
                    await this.runUpdateCommand();
                } else if (commandPromptResult.command === Commands.LOGIN) {
                    await this.runLoginCommand();
                } else if (commandPromptResult.command === Commands.LOGOUT) {
                    await this.runLogoutCommand();
                } else if (commandPromptResult.command === Commands.ADD_REPOSITORY) {
                    await this.runAddRepositoryCommand();
                } else if (commandPromptResult.command === Commands.REMOVE_REPOSITORY) {
                    await this.runRemoveRepositoryCommand();
                } else if (commandPromptResult.command === Commands.PUBLISH) {
                    await this.runPublishCommand();
                } else if (commandPromptResult.command === Commands.EDIT) {
                    await this.runEditCommand();
                }
            }
        });
    }

    async runPublishCommand(): Promise<void> {
        try {
            await publishPackage({});
        } catch (e) {
            console.error(e);
        }
    }

    async runEditCommand(): Promise<void> {
        try {
            await editPackage({});
        } catch (e) {
            console.error(e);
        }
    }

    async runFetchCommand(): Promise<void> {
        try {
            await fetchPackage({});
        } catch (e) {
            console.error(e);
        }
    }

    async runSearchCommand(): Promise<void> {
        try {
            await handleSearch({});
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }

    async runPackageCommand(): Promise<void> {
        try {
            await packageCommand({});
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }

    async runUpdateCommand(): Promise<void> {
        try {
            await updateCommandHandler({});
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }

    async runLoginCommand(): Promise<void> {
        try {
            await authenticateToRegistry({});
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }

    async runLogoutCommand(): Promise<void> {
        try {
            await logoutFromRegistry({});
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }

    async runAddRepositoryCommand(): Promise<void> {
        try {
            await addRepository({});
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }

    async runRemoveRepositoryCommand(): Promise<void> {
        try {
            await removeRepository({});
        } catch (e) {
            console.error(e);
            process.exit(1);
        }
    }
}
