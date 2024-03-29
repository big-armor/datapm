import { comparePackages } from "datapm-lib";
import chalk from "chalk";
import ora from "ora";
import { differenceToString } from "datapm-client-lib";
import { CompareArguments } from "./CompareCommand";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { CLIJobContext } from "./CommandTaskUtil";
import { checkDataPMVersion } from "../util/VersionCheckUtil";

export async function comparePackagesCommand(argv: CompareArguments): Promise<void> {
    const oraRef = ora({
        color: "yellow",
        spinner: "dots"
    });

    printDataPMVersion(argv);

    const jobContext = new CLIJobContext(oraRef, argv);

    // Fetching prior package
    oraRef.start("Fetching prior package");

    const priorPackageWithContext = await jobContext.getPackageFile(argv.priorPackage, "canonicalIfAvailable");

    oraRef.succeed("Fetched prior package");

    // Fetching new package
    oraRef.start("Fetching new package");

    const newPackageWithContext = await jobContext.getPackageFile(argv.newPackage, "canonicalIfAvailable");

    oraRef.succeed("Fetched new package");

    // Comparing packages
    oraRef.start("Comparing packages");

    if (priorPackageWithContext.packageFile.canonical === false) {
        oraRef.warn("The prior packageFile is a modified copy. Not a canonical original. Comparing may not be useful.");

        if (priorPackageWithContext.packageFile.modifiedProperties != null)
            oraRef.info(
                "Modified properties are: " + priorPackageWithContext.packageFile.modifiedProperties.join(", ")
            );
    }

    if (newPackageWithContext.packageFile.canonical === false) {
        oraRef.warn("The new packageFile is a modified copy. Not a canonical original. Comparing may not be useful.");
        if (priorPackageWithContext.packageFile.modifiedProperties != null)
            oraRef.info(
                "Modified properties are: " + priorPackageWithContext.packageFile.modifiedProperties.join(", ")
            );
    }

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

    await checkDataPMVersion(oraRef);
}
