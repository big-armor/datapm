import { CronJob } from "cron";
import { randomUUID } from "crypto";
import { UpdatePackageJob } from "datapm-client-lib";
import { Connection } from "typeorm";
import { PackageEntity } from "../entity/PackageEntity";
import { HeadlessJobContext } from "../job/HeadlessJobContext";
import { PackageRepository } from "../repository/PackageRepository";

let databaseConnection: Connection | null;

const packageUpdateCron = new CronJob("1/1 * * * *", packageUpdateSchedulingCronHandler, null, false, "America/New_York");

export function startPackageUpdateService(connection: Connection) {
    databaseConnection = connection;
    packageUpdateCron.start();
}

export async function stopPackageUpdateService() {
    packageUpdateCron.stop();
}

async function packageUpdateSchedulingCronHandler() {
    packageUpdateScheduling(databaseConnection!);
}

export async function packageUpdateScheduling(connection: Connection) {
    
    // Find the package that was updated the longest in the past
   const packageEntity: PackageEntity = connection.getCustomRepository(PackageRepository).getPackageOldestUpdate();

    const jobId = "package-update-" + randomUUID().substring(0,7);
    const jobContext = new HeadlessJobContext(jobId);
    const packageUpdateJob = new UpdatePackageJob(jobContext, {
        defaults: true,
        inspectionSeconds: 30,
        reference: {
            catalogSlug: packageEntity.catalog.slug,
            packageSlug: packageEntity.slug,
            registryURL: process.env["REGISTRY_URL"] as string,
        }
    });

    try {
        await packageUpdateJob.execute();
    } catch (error) {
        console.error("Error running package update job " + jobId )
        console.error(error);
    }

}
