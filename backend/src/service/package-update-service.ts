import { CronJob } from "cron";
import { randomUUID } from "crypto";
import { JobResult, PackageFileWithContext, UpdatePackageJob } from "datapm-client-lib";
import { Connection } from "typeorm";
import { AuthenticatedContext } from "../context";
import { PackageEntity } from "../entity/PackageEntity";
import { HeadlessJobContext } from "../job/HeadlessJobContext";
import { PackageRepository } from "../repository/PackageRepository";
import { SessionCache } from "../session-cache";
import { getEnvVariable } from "../util/getEnvVariable";

let databaseConnection: Connection | null;

const packageUpdateCron = new CronJob(
    "1/1 * * * *",
    packageUpdateSchedulingCronHandler,
    null,
    false,
    "America/New_York"
);

export function startPackageUpdateService(connection: Connection): void {
    databaseConnection = connection;
    packageUpdateCron.start();
}

export function stopPackageUpdateService(): void {
    packageUpdateCron.stop();
}

function packageUpdateSchedulingCronHandler(): void {
    if (!databaseConnection) {
        throw new Error("Database connection not initialized");
    }
    packageUpdateScheduling(databaseConnection);
}

export async function packageUpdateScheduling(connection: Connection): Promise<void> {
    const beforeDate = new Date(new Date().getTime() - 1000 * 60 * 60 * 24);

    // Find the package that was updated the longest in the past
    const packageEntities: PackageEntity[] = await connection
        .getCustomRepository(PackageRepository)
        .getPackageOldestUpdated(beforeDate, 0, 2, ["catalog", "creator"]);

    for (const packageEntity of packageEntities) {
        const jobId = "package-update-" + randomUUID().substring(0, 7);

        packageEntity.lastUpdateJobDate = new Date();
        await connection.getRepository(PackageEntity).save(packageEntity);

        const userContext: AuthenticatedContext = {
            cache: new SessionCache(),
            connection,
            isAdmin: false,
            me: packageEntity.creator
        };

        const jobContext = new HeadlessJobContext(jobId, userContext);

        const packageUpdateJob = new UpdatePackageJob(jobContext, {
            defaults: true,
            inspectionSeconds: 30,
            reference: {
                catalogSlug: packageEntity.catalog.slug,
                packageSlug: packageEntity.slug,
                registryURL: getEnvVariable("REGISTRY_URL") as string
            }
        });

        try {
            await packageUpdateJob.execute();
        } catch (error) {
            console.error("Error running package update job " + jobId);
            console.error(error);
        }
    }
}
