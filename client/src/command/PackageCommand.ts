import { Argv } from "yargs";
import { Command } from "./Command";

export class PackageArguments {
    defaults?: boolean;
    connection?: string;
    credentials?: string;
    configuration?: string;
    references?: string[];
}

export class PackageCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "package [references..]",
            describe: "Generate a new package listing file (ex: datapm-package.json) from a url",
            builder: (argv) =>
                argv
                    .positional("references", {
                        describe: "The url(s) or local files of the data",
                        demandOption: false,
                        array: true,
                        type: "string"
                    })
                    .option("defaults", {
                        type: "boolean",
                        describe:
                            "Use default user friendly/short package name, starting version and short package description"
                    })
                    .option("connection", {
                        describe: "JSON object for source connection",
                        type: "string"
                    })
                    .option("credentials", {
                        describe: "JSON object for source specific access credentials",
                        type: "string"
                    })
                    .option("configuration", {
                        describe: "JSON object for configuring source options",
                        type: "string"
                    })
                    .help(),
            handler: packageCommand
        });
    }
}

export async function packageCommand(args: PackageArguments): Promise<void> {
    try {
        const command = await import("./PackageCommandModule");

        await command.generatePackage(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
