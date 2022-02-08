import chalk from "chalk";
import ora from "ora";
import prompts from "prompts";
import { getRegistryConfigs, RegistryConfig } from "../util/ConfigUtil";
import { defaultPromptOptions } from "../util/parameters/DefaultParameterOptions";
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
                    type: "autocomplete",
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
        console.log("Below you can use basic boolean logic (& |)");
        const queryPromptResult = await prompts(
            {
                type: "text",
                name: "query",
                message: "Search terms?",
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

        console.log(chalk.magenta(`Searching ${registry.url}`));

        const client = getRegistryClientWithConfig(registry);
        const LIMIT = 20;
        let result;

        try {
            result = await client.searchPackages(argv.query, LIMIT, 0);
        } catch (error) {
            if (error.networkError?.result?.errors) {
                oraRef.fail(error.networkError?.result?.errors[0].message);
                console.log("");
                continue;
            }
            oraRef.fail(error.message);
            console.log("");
            continue;
        }
        if (result.errors) {
            oraRef.fail(`Error while searching registry: ${result.errors[0].message}`);
            console.log("");
            continue;
        }

        const count = result.data?.searchPackages.count;

        if (count === undefined || count === 0) {
            oraRef.info("No matching packages found");
            console.log("");
            continue;
        }

        if (count <= LIMIT) {
            oraRef.succeed(`Found ${count} results`);
        } else {
            oraRef.succeed(`Showing the first ${LIMIT} of ${count} packages`);
        }

        console.log("");
        for (const packageRef of result.data?.searchPackages?.packages || []) {
            console.log(chalk.yellow(packageRef.displayName));
            console.log(chalk.green(packageString(packageRef.identifier)));
            console.log(packageRef.description?.trim());
            console.log("");
        }

        console.log("");
    }
}
