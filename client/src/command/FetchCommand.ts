import { Command } from "./Command";
import { Argv } from "yargs";

export class FetchArguments {
    reference?: string;
    sink?: string;
    defaults?: boolean;
    sinkConfig?: string;
    sinkConnectionConfig?: string;
    sinkCredentialsConfig?: string;
    quiet?: boolean;
    forceUpdate?: boolean;
    repository?: string;
    credentials?: string;
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
                    .option("sinkConnectionConfig", {
                        type: "string"
                    })
                    .option("sinkCredentialsConfig", {
                        type: "string"
                    })
                    .option("repository", {
                        type: "string"
                    })
                    .option("credentials", {
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

        await fetchCommand.fetchPackage({
            ...args,
            repositoryIdentifier: args.repository,
            credentialsIdentifier: args.credentials
        });
    } catch (e) {
        console.error(e);
        // TODO print full error message in debug mode
        process.exit(1);
    }
}
