import chalk from "chalk";
import { passwordValid, validateUsernameOrEmail } from "datapm-lib";
import ora from "ora";
import { exit } from "process";
import prompts from "prompts";

import {
    CreateAPIKeyDocument,
    DeleteAPIKeyDocument,
    LoginDocument,
    MyAPIKeysDocument,
    RegistryStatusDocument,
    Scope,
    getRegistryClientWithConfig,
    RegistryClient,
    RegistryConfig,
    APIKey
} from "datapm-client-lib";
import { addRegistry, getRegistryConfigs, getRegistryConfig, removeRegistry } from "../util/ConfigUtil";

import os from "os";
import {
    Commands,
    RegistryAddArguments,
    RegistryAuthenticateArguments,
    RegistryLogoutArguments,
    RegistryRemoveArguments
} from "./RegistryCommand";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { defaultPromptOptions } from "../util/DefaultParameterOptions";
import { CLIJobContext } from "./CommandTaskUtil";
import { createRegistryClient } from "../util/RegistryClient";

export async function defaultRegistryCommandHandler(args: unknown): Promise<void> {
    const commandPromptResult = await prompts({
        type: "autocomplete",
        name: "command",
        message: "What action would you like to take?",
        choices: [
            { title: "Login to registry", value: Commands.LOGIN },
            { title: "Logout of registry", value: Commands.LOGOUT },
            { title: "Add anonymous registry", value: Commands.ADD },
            { title: "Remove local registry configuration", value: Commands.REMOVE }
        ],
        initial: 0
    });

    if (commandPromptResult.command === Commands.LOGIN) {
        await authenticateToRegistry(args as RegistryAddArguments);
    } else if (commandPromptResult.command === Commands.LOGOUT) {
        await logoutFromRegistry(args as RegistryRemoveArguments);
    } else if (commandPromptResult.command === Commands.ADD) {
        await addRegistryCommand(args as RegistryAddArguments);
    } else if (commandPromptResult.command === Commands.REMOVE) {
        await removeRegistryCommand(args as RegistryRemoveArguments);
    }
}

export async function addRegistryCommand(argv: RegistryAddArguments): Promise<void> {
    printDataPMVersion(argv);

    await promptForRegistryUrl(argv);

    const registryConf: RegistryConfig = {
        url: argv.url
    };
    if (argv.apiKey) registryConf.apiKey = argv.apiKey;

    addRegistry(registryConf);
    console.log(`Added registry ${registryConf.url} to local configuration`);
}

export async function removeRegistryCommand(argv: RegistryRemoveArguments): Promise<void> {
    printDataPMVersion(argv);

    await promptForRegistryUrl(argv, true);

    removeRegistry(argv.url);
}

export function listRegistries(args: unknown): void {
    printDataPMVersion(args);

    const registries = getRegistryConfigs();

    registries.forEach((registry) => console.log(registry.url));
}

export async function logoutFromRegistry(args: RegistryLogoutArguments): Promise<void> {
    printDataPMVersion(args);

    const oraRef = ora({
        color: "yellow",
        spinner: "dots"
    });

    const jobContext = new CLIJobContext(oraRef, args);

    await promptForRegistryUrl(args, true);

    if (!args.url) {
        console.error(chalk.red("No registry URL specified"));
        exit(1);
    }

    if (getRegistryConfig(args.url) == null) {
        console.error(chalk.red("The local registry config does not have an entry for that url. Nothing to do."));
        console.error(
            "Use the " + chalk.green("datapm registry list") + " command to view the locally configured registries"
        );
        exit(1);
    } else if (getRegistryConfig(args.url)?.apiKey == null) {
        removeRegistry(args.url);
        exit(1);
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userRegistryClient = getRegistryClientWithConfig(jobContext, { url: args.url! });

    oraRef.start("Deleting API Key from Registry");

    try {
        const apiKeysResponse = await userRegistryClient.getClient().query<{ myAPIKeys: APIKey[] }>({
            query: MyAPIKeysDocument
        });

        if (!apiKeysResponse.errors) {
            // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
            const localAPIKey = getRegistryConfig(args.url!)!.apiKey!;

            const localAPIKeyId = Buffer.from(localAPIKey, "base64").toString().split(".")[0];

            const apiKey = apiKeysResponse.data.myAPIKeys?.find((k) => k.id === localAPIKeyId);

            if (apiKey) {
                const deleteAPIKeyResponse = await userRegistryClient.getClient().mutate({
                    mutation: DeleteAPIKeyDocument,
                    variables: {
                        id: apiKey.id
                    }
                });

                if (!deleteAPIKeyResponse.errors) {
                    oraRef.succeed("Deleted API Key from registry.");
                } else {
                    oraRef.warn("There was a problem deleting the API Key from the registry.");
                    console.log(chalk.yellow("You will need to manually delete the API from the registry"));
                }
            } else {
                oraRef.warn("API Key not found on registry.");
            }
        } else {
            oraRef.warn("Not able to get user account.");
            console.log(chalk.yellow("You will need to manually delete the API from the registry"));
        }
    } catch (error) {
        oraRef.warn("Not able use existing API Key to contact registry.");
        console.log(chalk.yellow("You will need to manually delete the API from the registry"));
    }

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    removeRegistry(args.url!);
    oraRef.succeed("Removed local copy of API key");

    process.exit(0);
}

/** Assigns a valid URL to args.url */
async function promptForRegistryUrl(args: { url?: string }, failOk = false): Promise<void> {
    if (args.url == null) {
        while (true) {
            const urlResponse = await prompts(
                [
                    {
                        type: "text",
                        name: "url",
                        message: "Registry URL?",
                        initial: "https://datapm.io",
                        validate: async (value) => {
                            return validUrl(value);
                        }
                    }
                ],
                defaultPromptOptions
            );

            const registryUrlValidation = await validateRegistryUrl(urlResponse.url);
            if (registryUrlValidation === true || failOk) {
                args.url = urlResponse.url;
                break;
            } else {
                console.error(chalk.red(registryUrlValidation));
            }
        }
    } else {
        const registryUrlValidation = await validateRegistryUrl(args.url);

        if (registryUrlValidation !== true && !failOk) {
            console.error(chalk.red(registryUrlValidation));
            exit(1);
        }
    }
}

export async function authenticateToRegistry(args: RegistryAuthenticateArguments): Promise<void> {
    printDataPMVersion(args);

    await promptForRegistryUrl(args);

    if (args.username == null) {
        const usernameResponse = await prompts(
            [
                {
                    type: "text",
                    name: "username",
                    message: "Username or Email Address",
                    validate: (value) => {
                        const valid = validateUsernameOrEmail(value);

                        if (valid === "USERNAME_REQUIRED") return "Username required";
                        else if (valid === "INVALID_CHARACTERS")
                            return "Username must contain only letters, numbers, and hyphens";
                        else if (valid === "USERNAME_TOO_LONG") return "Must be shorter than 39 characters ";

                        return true;
                    }
                }
            ],
            defaultPromptOptions
        );

        args.username = usernameResponse.username;
    }

    if (args.password == null) {
        const passwordResponse = await prompts(
            [
                {
                    type: "password",
                    name: "password",
                    message: "Password",
                    validate: (value) => {
                        const valid = passwordValid(value);

                        if (valid === "PASSWORD_REQUIRED") return "Password required";
                        else if (valid === "INVALID_CHARACTERS")
                            return "Passwords less than 16 characters must include numbers or special characters (0-9@#$%!)";
                        else if (valid === "PASSWORD_TOO_LONG") return "Must be shorter than 100 characters ";
                        else if (valid === "PASSWORD_TOO_SHORT") return "Must 8 or more characters";

                        return true;
                    }
                }
            ],
            defaultPromptOptions
        );

        args.password = passwordResponse.password;
    }

    if (args.password == null) {
        throw new Error("Password is required");
    }

    if (args.username == null) {
        throw new Error("Username is required");
    }

    const oraRef = ora({
        color: "yellow",
        spinner: "dots"
    });

    oraRef.start("Authenticating...");

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const anonymousClient = new RegistryClient({ url: args.url! });

    const loginResponse = await anonymousClient.getClient().mutate({
        mutation: LoginDocument,
        variables: {
            password: args.password,
            username: args.username
        }
    });

    if (loginResponse.errors) {
        oraRef.fail("Authentication failed " + loginResponse.errors[0].message);
        exit(1);
    }

    oraRef.succeed("Authenticated");
    const hostname = os.hostname();

    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    const userRegistryClient = createRegistryClient(args.url!, loginResponse.data?.login);

    oraRef.start("Looking for existing API Key named " + hostname);

    const getAPIKeysResponse = await userRegistryClient.query<{ myAPIKeys: APIKey[] }>({
        query: MyAPIKeysDocument
    });

    if (getAPIKeysResponse.errors) {
        console.error("Error getting API Keys: " + getAPIKeysResponse.errors[0].message);
        exit(1);
    }

    const existingAPIKey = getAPIKeysResponse.data.myAPIKeys?.find((k) => k.label === hostname);

    if (existingAPIKey) {
        oraRef.succeed("Found an existing API Key named " + hostname);
        const confirmDeleteResponse = await prompts(
            [
                {
                    type: "autocomplete",
                    name: "delete",
                    message: "An API Key named '" + hostname + "' already exists. Delete it?",
                    choices: [
                        {
                            title: "Yes",
                            value: true
                        },
                        {
                            title: "No",
                            value: false
                        }
                    ]
                }
            ],
            defaultPromptOptions
        );

        if (confirmDeleteResponse.delete !== true) {
            console.log("Not deleting existing API key. Exiting");
            exit(1);
        }

        oraRef.start("Deleting exisitng API Key...");
        const deleteResponse = await userRegistryClient.mutate({
            mutation: DeleteAPIKeyDocument,
            variables: {
                id: existingAPIKey.id
            }
        });

        if (deleteResponse.errors) {
            oraRef.fail("Error deleting exisitng API Key: " + deleteResponse.errors[0].message);
            exit(1);
        }

        oraRef.succeed("Deleted existing API Key");
    } else {
        oraRef.succeed("No existing API key found");
    }

    oraRef.start("Creating new API Key...");

    const createAPIKeyResponse = await userRegistryClient.mutate({
        mutation: CreateAPIKeyDocument,
        variables: {
            value: {
                label: os.hostname(),
                scopes: [Scope.MANAGE_API_KEYS, Scope.MANAGE_PRIVATE_ASSETS, Scope.READ_PRIVATE_ASSETS]
            }
        }
    });

    if (createAPIKeyResponse.errors) {
        oraRef.fail("Error creating new API Key: " + createAPIKeyResponse.errors[0].message);
        exit(1);
    }

    addRegistry({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        url: args.url!,
        apiKey: Buffer.from(
            createAPIKeyResponse.data?.createAPIKey.id + "." + createAPIKeyResponse.data?.createAPIKey.secret
        ).toString("base64")
    });

    oraRef.succeed("Created and saved new API Key named `" + hostname + "`");
    console.log("Your requests to " + args.url + " will now be authenticated as user " + args.username);

    process.exit(0);
}

function validUrl(value: string): boolean | string {
    if (value === "") return true;

    if (!value.startsWith("http://") && !value.startsWith("https://")) {
        return "Must start with http:// or https://";
    }

    if (value.length < 10) {
        return "Not a valid URL - not long enough";
    }

    return true;
}

async function validateRegistryUrl(url: string): Promise<string | true> {
    try {
        const userRegistryClient = createRegistryClient(url, undefined);

        const response = await userRegistryClient.query({
            query: RegistryStatusDocument
        });

        if (response.errors) {
            return response.errors[0].message;
        }
    } catch (e) {
        return e.message;
    }

    return true;
}
