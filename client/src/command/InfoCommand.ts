import { Argv } from "yargs";

import { Command } from "./Command";

export class InfoArguments {
    reference: string;
}
export class InfoCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "info <reference>",
            describe: "Get info about a catalog, package, version, or data type",
            builder: (argv) => {
                return argv.positional("reference", {
                    describe: "package identifier, local file, or url",
                    demandOption: true,
                    type: "string"
                });
            },
            handler: async (args: InfoArguments) => {
                const infoCommandInternal = await import("./InfoCommandModule");
                await infoCommandInternal.getInfo(args);
            }
        });
    }
}
