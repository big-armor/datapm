import { CronJob } from "cron";
import { randomUUID } from "crypto";
import { JobResult, PackageFileWithContext, UpdatePackageJob } from "datapm-client-lib";
import { Connection } from "typeorm";
import { AuthenticatedContext } from "../context";
import { PackageEntity } from "../entity/PackageEntity";
import { HeadlessJobContext } from "../job/HeadlessJobContext";
import { PackageRepository } from "../repository/PackageRepository";
import { SessionCache } from "../session-cache";

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
    

    const beforeDate = new Date(new Date().getTime() - (1000 * 60 * 60 * 24));

    // Find the package that was updated the longest in the past
    const packageEntities: PackageEntity[] = await connection.getCustomRepository(PackageRepository).getPackageOldestUpdated(beforeDate, 0,2, ["catalog", "creator"]);

    for(const packageEntity of packageEntities) {
        
        const jobId = "package-update-" + randomUUID().substring(0,7);

        packageEntity.lastUpdateJobDate = new Date();
        await connection.getRepository(PackageEntity).save(packageEntity);

        const userContext: AuthenticatedContext = {
            cache: new SessionCache(),
            connection,
            me: packageEntity.creator
        }


        const jobContext = new HeadlessJobContext(jobId, userContext );



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

}
