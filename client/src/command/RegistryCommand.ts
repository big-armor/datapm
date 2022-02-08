import { Argv } from "yargs";

import { Command } from "./Command";

export const enum Commands {
    LOGIN = "LOGIN",
    LOGOUT = "LOGOUT",
    ADD = "ADD",
    REMOVE = "REMOVE"
}

export class RegistryAddArguments {
    url: string;
    apiKey?: string;
}

export class RegistryRemoveArguments {
    url: string;
}

export class RegistryAuthenticateArguments {
    url?: string | undefined;
    username?: string | undefined;
    password?: string | undefined;
}

export class RegistryLogoutArguments {
    url?: string | undefined;
}
export class RegistryCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "registry",
            describe: "Manage the localy configured registries",
            builder: (yargs) => {
                return yargs
                    .command({
                        command: "add <url> [apiKey]",
                        describe: "",
                        builder: (yargs) => {
                            return yargs
                                .positional("url", {
                                    demandOption: true,
                                    type: "string"
                                })
                                .positional("apiKey", {
                                    type: "string"
                                });
                        },
                        handler: async (args: RegistryAddArguments) => {
                            const module = await import("./RegistryCommandModule");
                            await module.addRegistryCommand(args);
                        }
                    })
                    .command({
                        command: "remove <url>",
                        describe: "",
                        builder: (yargs) =>
                            yargs.positional("url", {
                                demandOption: true,
                                type: "string"
                            }),
                        handler: async (args: RegistryRemoveArguments) => {
                            const module = await import("./RegistryCommandModule");
                            await module.removeRegistryCommand(args);
                        }
                    })
                    .command({
                        command: "list",
                        describe: "",
                        handler: async (args: unknown) => {
                            const module = await import("./RegistryCommandModule");
                            module.listRegistries(args);
                        }
                    })
                    .command({
                        command: "login [url] [username] [password]",
                        describe: "Create and save an API key",
                        builder: (yargs) => {
                            return yargs
                                .positional("url", {
                                    type: "string"
                                })
                                .positional("username", {
                                    type: "string"
                                })
                                .positional("password", {
                                    type: "string"
                                });
                        },
                        handler: authenticateToRegistry
                    })
                    .command({
                        command: "logout [url]",
                        describe: "Delete an existing API key",
                        builder: (yargs) => {
                            return yargs.positional("url", {
                                type: "string"
                            });
                        },
                        handler: logoutFromRegistry
                    });
            },
            handler: defaultRegistryCommand
        });
    }
}

export async function logoutFromRegistry(args: RegistryLogoutArguments): Promise<void> {
    try {
        const module = await import("./RegistryCommandModule");
        await module.logoutFromRegistry(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

export async function authenticateToRegistry(args: RegistryAuthenticateArguments): Promise<void> {
    try {
        const module = await import("./RegistryCommandModule");
        await module.authenticateToRegistry(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

export async function defaultRegistryCommand(args: unknown): Promise<void> {
    try {
        const module = await import("./RegistryCommandModule");
        await module.defaultRegistryCommandHandler(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
