import { ApolloQueryResult } from "@apollo/client";
import chalk from "chalk";
import { ParameterOption, ParameterType } from "datapm-lib";
import { CONNECTORS, JobContext, Package, PackageIdentifier, SearchPackagesResult } from "../main";
import { getRegistryClientWithConfig } from "./RegistryClient";

/** Prompts the user to input a package reference (identifier, url, or file name) */
export async function obtainReference(
    jobContext: JobContext,
    promptMessage: string,
    includeConnectors: boolean
): Promise<string> {
    const sourceConnectorOptions = CONNECTORS.filter((c) => c.hasSource()).map<ParameterOption>((c) => {
        return {
            title: c.getDisplayName(),
            value: c.getType()
        };
    });
    const initialOptions: ParameterOption[] = [];

    if (includeConnectors) {
        initialOptions.push(...sourceConnectorOptions);
    } else {
        const client = getRegistryClientWithConfig(jobContext, { url: "https://datapm.io" });
        const searchResults = await client.searchPackages("%", 10, 0);
        const searchResultsOptions = searchResults.data.searchPackages.packages?.map((p) =>
            mapPackageToOption(p.identifier, false)
        );
        initialOptions.push(...(searchResultsOptions ?? []));
    }

    const response = await jobContext.parameterPrompt([
        {
            type: ParameterType.AutoComplete,
            configuration: {},
            name: "reference",
            allowFreeFormInput: true,
            message: promptMessage,
            // TODO - callback for autocomplete so that we can search for packages by reference
            options: initialOptions.sort((a, b) => a.title.localeCompare(b.title)),
            validate: (value) => {
                if (!value) return "Required";
                return true;
            },
            onChange: async (input: string, currentChoices: ParameterOption[]): Promise<ParameterOption[]> => {
                if (input == null || input.trim().length === 0) {
                    return currentChoices;
                }

                const returnValue: ParameterOption[] = [];

                if (includeConnectors) {
                    const connectors = sourceConnectorOptions.filter((c) =>
                        c.title.toLowerCase().startsWith(input.toLowerCase())
                    );

                    returnValue.push(...connectors);
                }

                if (returnValue.length > 9) {
                    return returnValue;
                }

                const registries = jobContext.getRegistryConfigs();

                if (registries.find((r) => r.url === "https://datapm.io") == null) {
                    registries.push({
                        url: "https://datapm.io"
                    });
                }

                const searchPromises: Promise<ApolloQueryResult<{ searchPackages: SearchPackagesResult }>>[] = [];
                for (const registry of registries) {
                    const client = getRegistryClientWithConfig(jobContext, registry);
                    const searchPromise = client.searchPackages(input, 10, 0);
                    searchPromises.push(searchPromise);
                }

                const results = await Promise.allSettled(searchPromises);

                const packages: Package[] = [];
                for (const result of results) {
                    if (result.status === "rejected") continue;

                    if (result.value.data.searchPackages.packages)
                        packages.push(...result.value.data.searchPackages.packages);
                }

                const packageIdentifiers: PackageIdentifier[] = packages.map((p) => p.identifier);

                const sortedPackageIdentifiers = packageIdentifiers.sort((a, b) => {
                    const aI = a.catalogSlug + "/" + b.packageSlug;
                    const bI = b.catalogSlug + "/" + b.packageSlug;

                    return aI.localeCompare(bI);
                });

                returnValue.push(
                    ...sortedPackageIdentifiers.map<ParameterOption>((p) => {
                        return mapPackageToOption(p, registries.length > 1);
                    })
                );

                return returnValue;
            }
        }
    ]);

    return response.reference;
}

function mapPackageToOption(p: PackageIdentifier, includeRegistryHostName: boolean): ParameterOption {
    let title = p.catalogSlug + "/" + p.packageSlug;

    if (includeRegistryHostName) {
        title += " " + chalk.gray(p.registryURL.replace(/^https?:\/\//, ""));
    }

    return {
        title,
        value: p.registryURL + "/" + p.catalogSlug + "/" + p.packageSlug
    };
}
