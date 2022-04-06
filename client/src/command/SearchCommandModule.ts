import ora from "ora";
import { printDataPMVersion } from "../util/DatapmVersionUtil";

import { SearchArguments } from "./SearchCommand";
import { CLIJobContext } from "./CommandTaskUtil";
import { SearchJob } from "datapm-client-lib";
import { checkDataPMVersion } from "../util/VersionCheckUtil";

export async function handleSearch(argv: SearchArguments): Promise<void> {
    printDataPMVersion(argv);

    const oraRef = ora({
        color: "yellow",
        spinner: "dots"
    });

    const jobContext = new CLIJobContext(oraRef, argv);
    const job = new SearchJob(jobContext, argv);
    await job.execute();

    await checkDataPMVersion(oraRef);
}
