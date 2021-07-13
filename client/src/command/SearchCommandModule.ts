import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import { defaultPromptOptions } from "../util/ParameterUtils";
import { getRegistryConfigs, RegistryConfig } from "../util/ConfigUtil";
import { getRegistryClientWithConfig } from "../util/RegistryClient";
import { packageString } from "../util/RegistryReferenceUtil";
import { SearchArguments } from "./SearchCommand";

export async function handleSearch(argv: SearchArguments): Promise<void> {
    const oraRef = ora({
        color: "yellow",
        spinner: "dots"
    });

    // Get the registries
    const registries: RegistryConfig[] = getRegistryConfigs();

    if (argv.registry == null) {
        let selectedRegistries = "all";

        if (registries.length > 1) {
            const registryPromptResult = await prompts(
                {
                    type: "select",
                    name: "registry",
                    message: "Registry to search?",
                    choices: [
                        {
                            title: "All Registries",
                            value: "all"
                        },
                        ...registries.map((registry) => ({
                            title: registry.url,
                            value: registry.url
                        }))
                    ]
                },
                defaultPromptOptions
            );
            selectedRegistries = registryPromptResult.registry;
        }

        argv.registry = selectedRegistries;
    }

    if (argv.query == null) {
        const queryPromptResult = await prompts(
            {
                type: "text",
                name: "query",
                message: "Search query with basic boolean logic (&, |)?",
                validate: (value) => {
                    if (!value) return "Search query required";
                    return true;
                }
            },
            defaultPromptOptions
        );
        argv.query = queryPromptResult.query;
    }

    if (!registries.find((registry) => registry.url === "https://datapm.io")) {
        registries.push({ url: "https://datapm.io" });
    }

    if (argv.query == null) throw new Error("Query is required");

    // Loop through the registries
    for (const registry of registries) {
        if (argv.registry !== "all" && argv.registry !== registry.url) continue;

        oraRef.start(`Searching ${registry.url}`);

        const client = getRegistryClientWithConfig(registry);
        const LIMIT = 20;
        let result;

        try {
            result = await client.searchPackages(argv.query, LIMIT, 0);
        } catch (error) {
            if (error.networkError?.result?.errors) {
                oraRef.fail(error.networkError?.result?.errors[0].message);
                continue;
            }
            oraRef.fail(error.message);
            continue;
        }
        if (result.errors) {
            oraRef.fail(`Error while searching registry: ${result.errors[0].message}`);
            continue;
        }

        const count = result.data?.searchPackages.count;

        if (count === undefined || count === 0) {
            oraRef.fail("No matching packages found");
            continue;
        }

        oraRef.succeed();

        console.log("");
        if (count <= LIMIT) {
            console.log(chalk.magenta(`Found ${count} results`));
        } else {
            console.log(chalk.magenta(`Showing the first ${LIMIT} of ${count} packages`));
        }

        for (const packageRef of result.data?.searchPackages?.packages || []) {
            console.log(chalk.white(packageRef.displayName));
            console.log(chalk.green(packageString(packageRef.identifier)));
            console.log(packageRef.description?.trim());
            console.log("");
        }

        console.log("");
    }
}
