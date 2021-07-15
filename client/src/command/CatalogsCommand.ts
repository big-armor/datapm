import { Argv } from "yargs";
import { Command } from "./Command";

export class CatalogsCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "catalogs",
            describe: "View your catalogs",
            handler: viewCatalogs
        });
    }
}

export async function viewCatalogs(): Promise<void> {
    const viewCatalogs = await import("./CatalogsCommandModule");
    await viewCatalogs.viewCatalogs();
}
