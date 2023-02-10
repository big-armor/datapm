import chalk from "chalk";
import { DPMConfiguration } from "datapm-lib";
import { STANDARD_OUT_SINK_TYPE, FetchArguments, FetchPackageJob } from "datapm-client-lib";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import ora from "ora";
import { OraQuiet } from "../util/OraQuiet";
import { CLIJobContext } from "./CommandTaskUtil";
import { exit } from "process";
import { checkDataPMVersion } from "../util/VersionCheckUtil";

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

    process.stdin.on("keypress", function (
        ch,
        key: { name: string; ctrl: boolean; meta: boolean; shift: boolean; sequence: string }
    ) {
        if (key.ctrl === true && key.meta === false && key.shift === false && key.name === "r") {
            process.kill(process.pid, "SIGUSR1");
        }
    });

    const jobResult = await job.execute();

    if (jobResult.exitCode !== 0) {
        oraRef.fail(chalk.red(jobResult.errorMessage));
        exit(jobResult.exitCode);
    }

    if (jobResult.result != null && (jobResult.result?.parameterCount || 0) > 0) {
        console.log("");
        console.log(chalk.grey("Next time you can run this same configuration in a single command."));

        const sinkConfigRemovedParameterValues: DPMConfiguration = { ...jobResult.result.sinkConfiguration };
        jobResult.result?.sink.filterDefaultConfigValues(
            jobResult.result.packageFileWithContext.catalogSlug,
            jobResult.result.packageFileWithContext.packageFile,
            sinkConfigRemovedParameterValues
        );

        let command = `datapm fetch ${argv.reference} `;
        if (jobResult.result.sink.getType() === STANDARD_OUT_SINK_TYPE) {
            command += "--quiet ";
        }

        if (
            jobResult.result.sourceConnectionConfiguration &&
            Object.keys(jobResult.result.sourceConnectionConfiguration).length > 0
        ) {
            command += `--sourceConnectionConfig '${JSON.stringify(jobResult.result.sourceConnectionConfiguration)}' `;
        }

        if (jobResult.result.sourceCredentialsIdentifier) {
            command += `--sourceCredentialsIdentifier '${jobResult.result.sourceCredentialsIdentifier}' `;
        }

        if (jobResult.result.sourceConfiguration && Object.keys(jobResult.result.sourceConfiguration).length > 0) {
            command += `--sourceConfig '${JSON.stringify(jobResult.result.sourceConfiguration)}' `;
        }

        if (
            Object.values(jobResult.result.packageSourceConnectionConfiguration).find(
                (v) => Object.keys(v).length > 0
            ) != null
        ) {
            command += `--packageSourceConnectionConfig '${JSON.stringify(
                jobResult.result.packageSourceConnectionConfiguration
            )}' `;
        }

        if (
            jobResult.result.sourceCredentialsIdentifier == null &&
            Object.values(jobResult.result.packageSourceCredentialsIdentifiers).length > 0
        ) {
            command += `--packageSourceCredentialsIdentifiers '${JSON.stringify(
                jobResult.result.packageSourceCredentialsIdentifiers
            )}' `;
        }

        if (Object.values(jobResult.result.packageSourceConfiguration).find((v) => Object.keys(v).length > 0) != null) {
            command += `--packageSourceConfig '${JSON.stringify(jobResult.result.packageSourceConfiguration)}' `;
        }

        command += `--excludeSchemaProperties '${JSON.stringify(jobResult.result.excludedSchemaProperties)}' `;

        command += `--renameSchemaProperties '${JSON.stringify(jobResult.result.renamedSchemaProperties)}' `;

        command += `--sinkType ${jobResult.result.sink.getType()}`;

        if (jobResult.result.sinkRepositoryIdentifier)
            command += " --sinkRepository " + jobResult.result.sinkRepositoryIdentifier;
        else command += ` --sinkConnectionConfig '${JSON.stringify(jobResult.result.sinkConnectionConfiguration)}'`;

        if (jobResult.result.sinkCredentialsIdentifier !== undefined)
            command += " --sinkAccount " + jobResult.result.sinkCredentialsIdentifier;

        if (Object.values(sinkConfigRemovedParameterValues).length > 0) {
            command += ` --sinkConfig '${JSON.stringify(sinkConfigRemovedParameterValues)}'`;
        }

        if (argv.defaults) command += " --defaults";

        console.log(chalk.green(command));
    }

    if (jobResult.result?.sink.getType() === "stdout" && !argv.quiet) {
        console.error(
            chalk.yellow(
                "You should probably use the --quiet flag to disable all non-data output, so that your data in standard out is clean"
            )
        );
    }

    if (!argv.quiet) await checkDataPMVersion(oraRef);

    process.exit(0);
}
