import { Command } from "./Command";
import { Argv } from "yargs";

export class FetchArguments {
    reference?: string;
    sinkType?: string;
    defaults?: boolean;
    sinkConfig?: string;
    sinkConnectionConfig?: string;
    sinkCredentialsConfig?: string;
    sourceCredentialsIdentifier?: string;
    quiet?: boolean;
    forceUpdate?: boolean;
    sinkRepository?: string;
    sinkAccount?: string;
    excludeSchemaProperties?: string;
    renameSchemaProperties?: string;
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
                    .option("sourceConnectionConfig", {
                        type: "string"
                    })
                    .option("sourceCredentialsConfig", {
                        type: "string"
                    })
                    .option("sourceCredentialsIdentifier", {
                        type: "string"
                    })
                    .option("sourceConfig", {
                        type: "string"
                    })
                    .option("packageSourceConnectionConfig", {
                        type: "string"
                    })
                    .option("packageSourceCredentialsConfig", {
                        type: "string"
                    })
                    .option("packageSourceCredentialsIdentifiers", {
                        type: "string"
                    })
                    .option("packageSourceConfig", {
                        type: "string"
                    })
                    .option("sinkType", {
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
                    .option("sinkRepository", {
                        type: "string"
                    })
                    .option("sinkAccount", {
                        type: "string"
                    })
                    .option("excludeSchemaProperties", {
                        type: "string"
                    })
                    .option("renameSchemaProperties", {
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
            sinkRepository: args.sinkRepository,
            sinkCredentialsIdentifier: args.sinkAccount
        });
    } catch (e) {
        console.error(e);
        // TODO print full error message in debug mode
        process.exit(1);
    }
}
