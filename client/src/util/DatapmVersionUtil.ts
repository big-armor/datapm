import { readDataPMVersion } from "datapm-client-lib";
import os from "os";

let datapmVersionPrinted = false;

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types, @typescript-eslint/no-explicit-any
export function printDataPMVersion(argv: any): void {
    if (!datapmVersionPrinted && argv.quiet === undefined) {
        const version = readDataPMVersion();

        console.log("");
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        console.log("datapm client version " + version + " on " + os.platform + "-" + os.arch);
        console.log("");
        datapmVersionPrinted = true;
    }
}
