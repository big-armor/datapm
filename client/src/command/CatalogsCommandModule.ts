import { ApolloQueryResult } from "@apollo/client";
import chalk from "chalk";
import ora from "ora";
import { Catalog, RegistryClient } from "datapm-client-lib";
import { getRegistryConfigs } from "../util/ConfigUtil";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { checkDataPMVersion } from "../util/VersionCheckUtil";

export async function viewCatalogs(): Promise<void> {
    printDataPMVersion({});

    const oraRef = ora({
        color: "yellow",
        spinner: "dots"
    });

    const registries = getRegistryConfigs();
    if (registries.length === 0) {
        console.log(chalk.yellow("You are not logged in to any registries."));
        console.log("Use the command below to login to a registry:");
        console.log(chalk.green("datapm registry login"));
        process.exit(0);
    }

    // Fetching catalogs
    oraRef.start("Fetching catalogs");

    let registryResponses: ApolloQueryResult<{ myCatalogs: Catalog[] }>[] = [];

    try {
        registryResponses = await Promise.all(
            registries.map((registry) => {
                const registryClient = new RegistryClient(registry);
                return registryClient.getCatalogs();
            })
        );
        oraRef.succeed();
    } catch (error) {
        oraRef.fail();
        console.log(chalk.red(error.message));
        process.exit(1);
    }

    registryResponses.forEach((response) => {
        if (response.errors) {
            response.errors.forEach((error: Error) => {
                console.log(chalk.red(error.message));
            });
        }
        if (response.data) {
            response.data.myCatalogs.forEach((catalog: Catalog) => {
                console.log(catalog.displayName);
            });
        }
    });

    console.log(" ");

    await checkDataPMVersion(oraRef);
}
