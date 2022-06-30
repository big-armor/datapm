import { Argv } from "yargs";
import { Command } from "./Command";

export class CopyJobArguments {
    defaults?: boolean;
    reference?: string;
    dest?: string;
}

export class CopyPackageCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "copy [reference] [dest]",
            describe: "Copy a package file - not the data",
            builder: (argv) =>
                argv
                    .option("reference", {
                        description: "package identifier, local file, or url",
                        type: "string"
                    })
                    .option("dest", {
                        description: "What directory the package file should be saved in",
                        type: "string"
                    }),
            handler: copyPackage
        });
    }
}

export async function copyPackage(args: CopyJobArguments): Promise<void> {
    try {
        const copyCommand = await import("./CopyPackageCommandModule");

        const module = new copyCommand.CopyPackageCommandModule();
        await module.handleCommand(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
