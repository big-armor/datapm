import { Argv } from "yargs";
import { Command } from "./Command";

export class CompareArguments {
    priorPackage: string;
    newPackage: string;
    defaults?: boolean;
    quiet?: boolean;
}

export class CompareCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "compare <priorPackage> <newPackage>",
            describe: "Compare a prior and replacement package for differences",
            builder: (argv) => {
                return argv
                    .positional("priorPackage", {
                        describe: "Previous package identifier, file, or URL",
                        demandOption: true,
                        type: "string"
                    })
                    .positional("newPackage", {
                        describe: "Replacement package identifier, file, or URL",
                        demandOption: true,
                        type: "string"
                    })
                    .help();
            },
            handler: comparePackages
        });
    }
}

export async function comparePackages(args: CompareArguments): Promise<void> {
    try {
        const fetchCommand = await import("./CompareCommandModule");

        await fetchCommand.comparePackagesCommand(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
