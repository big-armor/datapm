import { ParameterType } from "datapm-lib";
import { RegistryConfig } from "../config/Config";
import { Job, JobContext, JobResult } from "./Task";
import { getRegistryClientWithConfig } from "../util/RegistryClient";

import chalk from "chalk";
import { packageString } from "../main";
export class SearchJobResult {}

export class SearchArguments {
    registry?: string;
    query?: string;
}

export class SearchJob extends Job<SearchJobResult> {
    constructor(private jobContext: JobContext, private argv: SearchArguments) {
        super(jobContext);
    }

    async _execute(): Promise<JobResult<SearchJobResult>> {
        // Get the registries
        const registries: RegistryConfig[] = this.jobContext.getRegistryConfigs();

        if (this.argv.registry == null) {
            let selectedRegistries = "all";

            if (registries.length > 1) {
                const registryPromptResult = await this.jobContext.parameterPrompt([
                    {
                        type: ParameterType.AutoComplete,
                        name: "registry",
                        message: "Registry to search?",
                        configuration: {},
                        options: [
                            {
                                title: "All Registries",
                                value: "all"
                            },
                            ...registries.map((registry) => ({
                                title: registry.url,
                                value: registry.url
                            }))
                        ]
                    }
                ]);
                selectedRegistries = registryPromptResult.registry;
            }

            this.argv.registry = selectedRegistries;
        }

        if (this.argv.query == null) {
            console.log("Below you can use basic boolean logic (& |)");
            const queryPromptResult = await this.jobContext.parameterPrompt([
                {
                    type: ParameterType.Text,
                    name: "query",
                    message: "Search terms?",
                    configuration: {},
                    validate2: (value) => {
                        if (!value) return "Search query required";
                        return true;
                    }
                }
            ]);
            this.argv.query = queryPromptResult.query;
        }

        if (!registries.find((registry) => registry.url === "https://datapm.io")) {
            registries.push({ url: "https://datapm.io" });
        }

        if (this.argv.query == null) throw new Error("Query is required");

        // Loop through the registries
        for (const registry of registries) {
            if (this.argv.registry !== "all" && this.argv.registry !== registry.url) continue;

            this.jobContext.setCurrentStep(`Searching ${registry.url}`);

            const client = getRegistryClientWithConfig(this.jobContext, registry);
            const LIMIT = 20;
            let result;

            try {
                result = await client.searchPackages(this.argv.query, LIMIT, 0);
            } catch (error) {
                if (error.networkError?.result?.errors) {
                    this.jobContext.print("ERROR", error.networkError?.result?.errors[0].message);
                    this.jobContext.print("NONE", "");
                    continue;
                }
                this.jobContext.print("ERROR", error.message);
                this.jobContext.print("NONE", "");
                continue;
            }
            if (result.errors) {
                this.jobContext.print("ERROR", `Error while searching registry: ${result.errors[0].message}`);
                this.jobContext.print("NONE", "");
                continue;
            }

            const count = result.data?.searchPackages.count;

            if (count === undefined || count === 0) {
                this.jobContext.print("INFO", "No matching packages found");
                this.jobContext.print("NONE", "");
                continue;
            }

            if (count <= LIMIT) {
                this.jobContext.print("SUCCESS", `Found ${count} results`);
            } else {
                this.jobContext.print("SUCCESS", `Showing the first ${LIMIT} of ${count} packages`);
            }

            console.log("");
            for (const packageRef of result.data?.searchPackages?.packages || []) {
                this.jobContext.print("NONE", chalk.yellow(packageRef.displayName));
                this.jobContext.print("NONE", chalk.green(packageString(packageRef.identifier)));
                this.jobContext.print("NONE", packageRef.description?.trim() || "");
                this.jobContext.print("NONE", "");
            }

            this.jobContext.print("NONE", "");
        }

        return {
            exitCode: 0
        };
    }
}
