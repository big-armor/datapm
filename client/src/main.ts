#!/usr/bin/env node

import yargs from "yargs";
import { CatalogsCommand } from "./command/CatalogsCommand";
import { CompareCommand } from "./command/CompareCommand";
import { ConfigurationCommand } from "./command/ConfigurationCommand";
import { FetchCommand } from "./command/FetchCommand";
import { PackageCommand } from "./command/PackageCommand";
import { InfoCommand } from "./command/InfoCommand";
import { PublishPackageCommand } from "./command/PublishPackageCommand";
import { RegistryCommand } from "./command/RegistryCommand";
import { SearchCommand } from "./command/SearchCommand";
import { UpdateCommand } from "./command/UpdateCommand";
import { FallbackCommand } from "./command/FallbackCommand";
import { RepositoryCommand } from "./command/RepositoryCommand";
import { EditCommand } from "./command/EditCommand";
import { CopyPackageCommand } from "./command/CopyPackageCommand";

let argv = yargs;

const commands = [
    new ConfigurationCommand(),
    new RegistryCommand(),
    new RepositoryCommand(),

    new SearchCommand(),
    new InfoCommand(),
    new FetchCommand(),
    new CompareCommand(),

    new PackageCommand(),
    new PublishPackageCommand(),
    new CopyPackageCommand(),
    new UpdateCommand(),
    new EditCommand(),

    new CatalogsCommand(),

    new FallbackCommand()
];

commands.forEach((command) => {
    argv = command.prepareCommand(argv);
});

// eslint-disable-next-line no-unused-expressions
yargs
    .option("defaults", {
        type: "boolean",
        describe: "Use default settings"
    })
    .recommendCommands()
    .strict()
    .version(false)
    .option("version", {
        alias: "v",
        describe: "Show the version of DataPM",
        type: "string"
    })
    .help().argv;
