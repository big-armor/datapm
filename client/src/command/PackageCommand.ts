import { Argv } from "yargs";
import { Command } from "./Command";

export class PackageArguments {
    defaults?: boolean;
    sourceConfiguration?: string;
    urls?: string[];
}

export class PackageCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "package [reference]",
            describe: "Generate a new package listing file (ex: datapm-package.json) from a url",
            builder: (argv) =>
                argv
                    .positional("urls", {
                        describe: "The url(s) of the data",
                        demandOption: false,
                        array: true,
                        type: "string"
                    })
                    .option("defaults", {
                        type: "boolean",
                        describe:
                            "Use default user friendly/short package name, starting version and short package description"
                    })
                    .option("sourceConfiguration", {
                        describe: "JSON object for configuring source",
                        type: "string"
                    })
                    .help(),
            handler: packageCommand
        });
    }
}

export async function packageCommand(args: PackageArguments): Promise<void> {
    const fetchCommand = await import("./PackageCommandModule");
    await fetchCommand.generatePackage(args);
}
