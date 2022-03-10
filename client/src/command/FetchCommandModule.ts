import chalk from "chalk";
import { DPMConfiguration } from "datapm-lib";
import { STANDARD_OUT_SINK_TYPE, FetchArguments, FetchPackageJob } from "datapm-client-lib";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import ora from "ora";
import { OraQuiet } from "../util/OraQuiet";
import { CLIJobContext } from "./CommandTaskUtil";
import { exit } from "process";

export async function fetchPackage(argv: FetchArguments): Promise<void> {
    if (argv.quiet) {
        argv.defaults = true;
    }

    const oraRef: ora.Ora = argv.quiet
        ? new OraQuiet()
        : ora({
              color: "yellow",
              spinner: "dots"
          });

    printDataPMVersion(argv);

    const job = new FetchPackageJob(new CLIJobContext(oraRef, argv), argv);

    const jobResult = await job.execute();

    if (jobResult.exitCode !== 0) {
        exit(jobResult.exitCode);
    }

    if (jobResult.result != null && (jobResult.result?.parameterCount || 0) > 0) {
        console.log("");
        console.log(chalk.grey("Next time you can run this same configuration in a single command."));

        const defaultRemovedParameterValues: DPMConfiguration = { ...jobResult.result.sinkConfiguration };
        jobResult.result?.sink.filterDefaultConfigValues(
            jobResult.result.packageFileWithContext.catalogSlug,
            jobResult.result.packageFileWithContext.packageFile,
            defaultRemovedParameterValues
        );
        // This prints the password on the console :/

        let command = `datapm fetch ${argv.reference} `;
        if (jobResult.result.sink.getType() === STANDARD_OUT_SINK_TYPE) {
            command += "--quiet ";
        }
        command += `--sink ${jobResult.result.sink.getType()}`;

        if (jobResult.result.repositoryIdentifier) command += " --repository " + jobResult.result.repositoryIdentifier;

        if (jobResult.result.credentialsIdentifier)
            command += " --credentials " + jobResult.result.credentialsIdentifier;

        command += ` --sinkConfig '${JSON.stringify(defaultRemovedParameterValues)}' --defaults`;

        console.log(chalk.green(command));
    }

    if (jobResult.result?.sink.getType() === "stdout" && !argv.quiet) {
        console.error(
            chalk.yellow(
                "You should probably use the --quiet flag to disable all non-data output, so that your data in standard out is clean"
            )
        );
    }

    process.exit(0);
}
