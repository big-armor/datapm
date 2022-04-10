import { DATAPM_VERSION } from "datapm-lib";
import os from "os";

let datapmVersionPrinted = false;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function printDataPMVersion(argv: any): void {
    if (!datapmVersionPrinted && argv.quiet === undefined) {
        console.log("");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        console.log("datapm client version " + DATAPM_VERSION + " on " + os.platform + "-" + os.arch);
        console.log("");
        datapmVersionPrinted = true;
    }
}
