import chalk from "chalk";
import { Argv } from "yargs";
import { getConfiguration, getConfigurationPath, resetConfiguration } from "../util/ConfigUtil";
import { Command } from "./Command";

export class ConfigurationCommand implements Command {
    prepareCommand(argv: Argv): Argv {
        return argv.command({
            command: "configuration",
            describe: "Managing the local configuration files",
            builder: (yargs) => {
                return yargs
                    .command({
                        command: "show",
                        describe: "Show the local configuration file",
                        handler: this.showConfiguration
                    })
                    .command({
                        command: "reset",
                        describe: "Remove the local configuration.",
                        handler: this.resetConfiguration
                    })
                    .demandCommand(1);
            },
            handler: () => {
                //
            }
        });
    }

    showConfiguration(): void {
        console.log(chalk.yellow(`Configuration stored at ${getConfigurationPath()}`));
        console.log(getConfiguration());
    }

    resetConfiguration(): void {
        resetConfiguration();
        console.log(chalk.yellow(`Configuration stored at ${getConfigurationPath()} has been reset`));
    }
}
