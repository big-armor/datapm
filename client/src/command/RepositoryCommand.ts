import { Argv } from "yargs";

import { Command } from "./Command";

export const enum Commands {
    ADD = "ADD",
    UPDATE = "UPDATE",
    REMOVE = "REMOVE",
    ADD_CREDENTIALS = "ADD_CREDENTIALS",
    REMOVE_CREDENTIALS = "REMOVE_CREDENTIALS",
    UPDATE_CREDENTIALS = "UPDATE_CREDENTIALS"
}

export class RepositoryDefaultArguments {}

export class RepositoryAddArguments {
    repositoryType?: string;
}

export class RepositoryUpdateArguments {
    repositoryType?: string;
    repositoryIdentifier?: string;
}

export class RepositoryRemoveArguments {
    repositoryType?: string;
    repositoryIdentifier?: string;
}

export class CredentialsAddArguments {
    repositoryType?: string;
    repositoryIdentifier?: string;
}

export class CredentialsRemoveArguments {
    repositoryType?: string;
    repositoryIdentifier?: string;
    credentialsIdentifier?: string;
}

export class CredentialsUpdateArguments {
    repositoryType?: string;
    repositoryIdentifier?: string;
    credentialsIdentifier?: string;
}

export class RepositoryCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "repository",
            describe: "Manage repository and credentials saved locally",
            builder: (yargs) => {
                return yargs
                    .command({
                        command: "add [repositoryType]",
                        describe: "",
                        builder: (yargs) => {
                            return yargs.positional("repositoryType", {
                                type: "string"
                            });
                        },
                        handler: addRepository
                    })
                    .command({
                        command: "update [repositoryType] [repositoryIdentifier]",
                        describe: "",
                        builder: (yargs) => {
                            return yargs
                                .positional("repositoryType", {
                                    type: "string"
                                })
                                .positional("repositoryIdentifier", {
                                    type: "string"
                                });
                        },
                        handler: updateRepository
                    })
                    .command({
                        command: "remove [repositoryType] [repositoryIdentifier]",
                        describe: "",
                        builder: (yargs) => {
                            return yargs
                                .positional("repositoryType", {
                                    type: "string"
                                })
                                .positional("repositoryIdentifier", {
                                    type: "string"
                                });
                        },
                        handler: removeRepository
                    })
                    .command({
                        command: "credential",
                        describe: "",
                        builder: (yargs) => {
                            return yargs
                                .command({
                                    command: "add [repositoryType] [repositoryIdentifier]",
                                    describe: "",
                                    builder: (yargs) => {
                                        return yargs
                                            .positional("repositoryType", {
                                                type: "string"
                                            })
                                            .positional("repositoryIdentifier", {
                                                type: "string"
                                            });
                                    },
                                    handler: addCredentials
                                })
                                .command({
                                    command: "remove [repositoryType] [repositoryIdentifier] [credentialsIdentifier]",
                                    describe: "",
                                    builder: (yargs) => {
                                        return yargs
                                            .positional("repositoryType", {
                                                type: "string"
                                            })
                                            .positional("repositoryIdentifier", {
                                                type: "string"
                                            })
                                            .positional("credentialsIdentifier", {
                                                type: "string"
                                            });
                                    },
                                    handler: removeCredentials
                                });
                        },
                        handler: removeRepository
                    });
            },
            handler: defaultRepositoryCommand
        });
    }
}

export async function defaultRepositoryCommand(args: RepositoryDefaultArguments): Promise<void> {
    try {
        const module = await import("./RepositoryCommandModule");
        await module.defaultRepositoryCommandHandler(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

export async function addRepository(args: RepositoryAddArguments): Promise<void> {
    try {
        const module = await import("./RepositoryCommandModule");
        await module.addRepository(args);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

export async function updateRepository(args: RepositoryUpdateArguments): Promise<void> {
    try {
        const module = await import("./RepositoryCommandModule");
        await module.updateRepository(args);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

export async function removeRepository(args: RepositoryRemoveArguments): Promise<void> {
    try {
        const module = await import("./RepositoryCommandModule");
        await module.removeRepository(args);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

export async function addCredentials(args: CredentialsAddArguments): Promise<void> {
    try {
        const module = await import("./RepositoryCommandModule");
        await module.addCredentials(args);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}

export async function removeCredentials(args: CredentialsRemoveArguments): Promise<void> {
    try {
        const module = await import("./RepositoryCommandModule");
        await module.removeCredentials(args);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
