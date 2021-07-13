import { comparePackages } from "datapm-lib";
import chalk from "chalk";
import ora from "ora";
import { getPackage } from "../util/PackageAccessUtil";
import { differenceToString } from "../util/PackageUtil";
import { CompareArguments } from "./CompareCommand";

export async function comparePackagesCommand(argv: CompareArguments): Promise<void> {
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
