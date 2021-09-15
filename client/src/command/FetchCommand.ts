import { Command } from "./Command";
import { Argv } from "yargs";
export class FetchArguments {
    reference?: string;
    sink?: string;
    defaults?: boolean;
    sinkConfig?: string;
    quiet?: boolean;
    forceUpdate?: boolean;
}

export class FetchCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "fetch [reference]",
            describe: "Obtain a data package, or individual data type from a package",
            builder: (argv) => {
                return argv
                    .positional("reference", {
                        describe: "package identifier, local file, or url",
                        demandOption: false,
                        type: "string"
                    })
                    .option("quiet", {
                        type: "boolean",
                        describe: "Do not output status messages"
                    })
                    .option("forceUpdate", {
                        type: "boolean",
                        describe: "Run fetch without checking state"
                    })
                    .option("sink", {
                        type: "string", // TODO make each sink and source a module with a light-weight description
                        describe: "destination"
                    })
                    .option("sinkConfig", {
                        type: "string"
                    })
                    .help();
            },
            handler: fetchPackage
        });
    }
}
export async function fetchPackage(args: FetchArguments): Promise<void> {
    try {
        const fetchCommand = await import("./FetchCommandModule");

        await fetchCommand.fetchPackage(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
