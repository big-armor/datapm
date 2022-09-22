import chalk from "chalk";
import { RegistryStatusDocument } from "datapm-client-lib";
import { DATAPM_VERSION } from "datapm-lib";
import { Ora } from "ora";
import { SemVer } from "semver";
import { createRegistryClient } from "./RegistryClient";

export async function checkDataPMVersion(oraRef: Ora): Promise<void> {
    try {
        await _checkDataPMVersion(oraRef);
    } catch (error) {
        oraRef.info("There was a problem checking for DataPM updates. " + error.message);
        console.log(" ");
    }
}

async function _checkDataPMVersion(oraRef: Ora): Promise<boolean> {
    const registryClient = createRegistryClient("https://datapm.io", undefined);

    const response = await registryClient.query({
        query: RegistryStatusDocument
    });

    if (response.error != null) {
        return false;
    }

    const status = response.data.registryStatus;

    const localSemVer = new SemVer(DATAPM_VERSION);

    const serverSemVer = new SemVer(status.version);

    if (localSemVer.compare(serverSemVer) < 0) {
        console.log(" ");
        oraRef.warn(
            chalk.yellow(
                `There is a new version (${status.version}) of DataPM available. You are using ${localSemVer.format()}.`
            )
        );
        console.log(chalk.green("https://datapm.io/downloads"));

        return true;
    }

    return false;
}
