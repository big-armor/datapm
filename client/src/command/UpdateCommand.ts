import { Argv } from "yargs";
import { Command } from "./Command";
export class UpdateArguments {
    reference?: string;
    defaults?: boolean;
    forceUpdate?: boolean;
}
export class UpdateCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "update [reference]",
            describe: "Update an existing data package",
            builder: (argv) => {
                return argv
                    .positional("reference", {
                        describe: "package identifier, local file, or url",
                        demandOption: false,
                        type: "string"
                    })
                    .option("forceUpdate", {
                        type: "boolean",
                        describe: "Do not check state"
                    })
                    .option("inspectionSeconds", {
                        type: "number",
                        describe: "Number of seconds to wait for inspection to complete"
                    });
            },
            handler: updateCommandHandler
        });
    }
}

export async function updateCommandHandler(args: UpdateArguments): Promise<void> {
    try {
        const command = await import("./UpdateCommandModule");
        await command.updatePackage(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
