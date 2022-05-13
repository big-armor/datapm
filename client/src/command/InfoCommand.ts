import { Argv } from "yargs";

import { Command } from "./Command";

export class InfoArguments {
    reference?: string;
}
export class InfoCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "info [reference]",
            describe: "Get info about a catalog, package, version, or data type",
            builder: (argv) => {
                return argv.option("reference", {
                    describe: "package identifier, local file, or url",
                    type: "string"
                });
            },
            handler: async (args: InfoArguments) => {
                try {
                    const infoCommandInternal = await import("./InfoCommandModule");

                    await infoCommandInternal.getInfo(args);
                } catch (e) {
                    console.error(e);
                    process.exit(1);
                }
            }
        });
    }
}

export async function handleInfo(args: InfoArguments): Promise<void> {
    try {
        const command = await import("./InfoCommandModule");
        await command.getInfo(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
