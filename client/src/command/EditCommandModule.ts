import chalk from "chalk";
import ora from "ora";
import { EditArguments } from "./EditCommand";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { CLIJobContext } from "./CommandTaskUtil";
import { EditJob } from "datapm-client-lib";
import { checkDataPMVersion } from "../util/VersionCheckUtil";

export async function editPackage(argv: EditArguments): Promise<void> {
    printDataPMVersion(argv);

    const oraRef: ora.Ora = ora({
        color: "yellow",
        spinner: "dots"
    });

    const jobContext = new CLIJobContext(oraRef, argv);

    const editJob = new EditJob(jobContext, argv);

    try {
        const results = await editJob.execute();

        if (results.exitCode !== 0) {
            oraRef.fail(chalk.red(results.errorMessage));
            process.exit(results.exitCode);
        }

        if (results.result == null) {
            throw new Error("No results returned");
        }

        const packageFileWithContext = results.result?.packageFileWithContext;

        if (packageFileWithContext.contextType === "localFile") {
            console.log("");
            console.log(chalk.grey("When you are ready, you can publish with the following command"));
            console.log(
                chalk.green(`datapm publish ${packageFileWithContext.packageReference.replace("file://", "")}`)
            );
            console.log("");
            process.exit(0);
        }

        await checkDataPMVersion(oraRef);

        process.exit(0);
    } catch (error) {
        console.error(chalk.red(error.message));
        process.exit(1);
    }
}
