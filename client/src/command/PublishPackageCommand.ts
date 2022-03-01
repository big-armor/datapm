import { Argv } from "yargs";
import { PublishJobArguments } from "../task/PublishJob";
import { Command } from "./Command";

export class PublishPackageCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "publish [reference]",
            describe: "Publish a data package to the specified catalog",
            builder: (argv) =>
                argv.option("reference", {
                    description: "package identifier, local file, or url",
                    type: "string"
                }),
            handler: publishPackage
        });
    }
}

export async function publishPackage(args: PublishJobArguments): Promise<void> {
    try {
        const publishCommand = await import("./PublishPackageCommandModule");

        const module = new publishCommand.PublishPackageCommandModule();
        await module.handleCommand(args);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}
