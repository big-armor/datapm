import ora from "ora";
import { printDataPMVersion } from "../util/DatapmVersionUtil";
import { InfoArguments } from "./InfoCommand";
import { CLIJobContext } from "./CommandTaskUtil";
import { InfoJob } from "datapm-client-lib";
import { checkDataPMVersion } from "../util/VersionCheckUtil";

export async function getInfo(argv: InfoArguments): Promise<void> {
    printDataPMVersion(argv);

    const oraRef = ora({
        color: "yellow",
        spinner: "dots",
        text: `Getting package info: ${argv.reference}`
    });

    const jobContext = new CLIJobContext(oraRef, {
        ...argv,
        defaults: false,
        quiet: false
    });

    const job = new InfoJob(jobContext, argv);

    const result = await job.execute();

    await checkDataPMVersion(oraRef);

    process.exit(result.exitCode);
}
