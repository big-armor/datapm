import { Argv } from "yargs";
import { Command } from "./Command";
export class EditArguments {
    reference?: string;
}

export class EditCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "edit [reference]",
            describe: "Edit an existing data package",
            builder: (argv) => {
                return argv.positional("reference", {
                    describe: "package identifier, local file, or registry url",
                    demandOption: false,
                    type: "string"
                });
            },
            handler: editCommandHandler
        });
    }
}

export async function editCommandHandler(args: EditArguments): Promise<void> {
    try {
        const command = await import("./EditCommandModule");
        await command.editPackage(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
