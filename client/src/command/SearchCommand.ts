import { Argv } from "yargs";
import { getRegistryConfigs } from "../util/ConfigUtil";
import { Command } from "./Command";

export class SearchArguments {
    registry?: string;
    query?: string;
}

export class SearchCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv
            .command({
                command: "search [query]",
                describe: "Search the locally configured registries",
                builder: (yargs) => {
                    const registries = getRegistryConfigs();

                    return yargs
                        .positional("query", {
                            describe: "Search query with basic boolean logic (&, |).",
                            demandOption: false,
                            type: "string"
                        })
                        .option("registry", {
                            choices: ["all", ...registries.map((registry) => registry.url)],
                            default: "all",
                            desc: "Registries to search.",
                            demandOption: false
                        });
                },
                handler: handleSearch
            })
            .showHelpOnFail(true);
    }
}

export async function handleSearch(args: SearchArguments): Promise<void> {
    const command = await import("./SearchCommandModule");
    await command.handleSearch(args);
}
