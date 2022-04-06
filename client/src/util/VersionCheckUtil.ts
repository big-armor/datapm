import chalk from "chalk";
import { readDataPMVersion, RegistryStatusDocument } from "datapm-client-lib";
import { SemVer } from "semver";
import { createRegistryClient } from "./RegistryClient";

export async function checkDataPMVersion(): Promise<void> {
    try {
        console.log(" ");
        await _checkDataPMVersion();
    } catch (error) {
        console.error("There was a problem checking for DataPM updates. " + error.message);
        console.log(" ");
    }
}

async function _checkDataPMVersion(): Promise<boolean> {
    const registryClient = createRegistryClient("https://datapm.io", undefined);

    const response = await registryClient.query({
        query: RegistryStatusDocument
    });

    if (response.error != null) {
        return false;
    }

    const status = response.data.registryStatus;

    const localDataPMVersion = readDataPMVersion();

    const localSemVer = new SemVer(localDataPMVersion);

    const serverSemVer = new SemVer(status.version);

    if (localSemVer.compare(serverSemVer) < 0) {
        console.error(
            chalk.yellow(
                `There is a new version (${status.version}) of DataPM available. You are using ${localDataPMVersion}.`
            )
        );
        console.log(chalk.green("http://datapm.io/downloads"));
        console.log(" ");

        return true;
    }

    return false;
}
