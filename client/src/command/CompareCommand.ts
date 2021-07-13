import chalk from "chalk";
import { comparePackages } from "datapm-lib";
import ora from "ora";
import { Argv } from "yargs";
import { getPackage } from "../util/PackageAccessUtil";
import { differenceToString } from "../util/PackageUtil";
import { Command } from "./Command";

class CompareArguments {
    priorPackage: string;
    newPackage: string;
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
            handler: this.comparePackages
        });
    }

    async comparePackages(argv: CompareArguments): Promise<void> {
        const oraRef = ora({
            color: "yellow",
            spinner: "dots"
        });

        // Fetching prior package
        oraRef.start("Fetching prior package");

        const priorPackageWithContext = await getPackage(argv.priorPackage).catch((error) => {
            oraRef.fail();
            console.log(chalk.red(error.message));
            process.exit(1);
        });

        oraRef.succeed("Fetched prior package");

        // Fetching new package
        oraRef.start("Fetching new package");

        const newPackageWithContext = await getPackage(argv.newPackage).catch((error) => {
            oraRef.fail();
            console.log(chalk.red(error.message));
            process.exit(1);
        });

        oraRef.succeed("Fetched new package");

        // Comparing packages
        oraRef.start("Comparing packages");

        const differences = comparePackages(priorPackageWithContext.packageFile, newPackageWithContext.packageFile);

        oraRef.succeed("Compared packages");
        if (differences.length === 0) {
            console.log("No differences found");
        } else {
            console.log(`Found ${differences.length} differences`);
        }

        differences.forEach((difference) => {
            const message = differenceToString(difference);

            console.log(chalk.yellow(message));
        });
    }
}
