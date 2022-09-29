import chalk from "chalk";
import ora from "ora";
import { UpdateArguments, UpdatePackageJob } from "datapm-client-lib";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { CLIJobContext } from "./CommandTaskUtil";
import { checkDataPMVersion } from "../util/VersionCheckUtil";

export async function updatePackage(argv: UpdateArguments): Promise<void> {
    printDataPMVersion(argv);

    const oraRef: ora.Ora = ora({
        color: "yellow",
        spinner: "dots"
    });

    const job = new UpdatePackageJob(new CLIJobContext(oraRef, argv), argv);

    try {
        const taskResult = await job.execute();

        if (taskResult.exitCode !== 0) {
            oraRef.fail(taskResult.errorMessage);
            process.exit(taskResult.exitCode);
        }

        if (taskResult.result == null) {
            throw new Error("UpdatePackage task result is null");
        }

        if (taskResult.result.contextType === "localFile") {
            console.log("");
            console.log(chalk.grey("When you are ready, you can publish with the following command"));
            console.log(chalk.green(`datapm publish ${taskResult.result.packageReference.replace("file://", "")}`));
            process.exit(0);
        }

        console.log(" ");

        await checkDataPMVersion(oraRef);

        process.exit(0);
    } catch (error) {
        console.error(error);
        process.exit(1);
    }
}
