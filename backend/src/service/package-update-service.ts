import { CronJob } from "cron";
import { Connection } from "typeorm";

let databaseConnection: Connection | null;

const packageUpdateCron = new CronJob("1/1 * * * *", packageUpdateSchedulingCronHandler, null, false, "America/New_York");

export function startNotificationService(connection: Connection) {
    databaseConnection = connection;
    packageUpdateCron.start();
}

export async function stopNotificationService() {
    packageUpdateCron.stop();
}

async function packageUpdateSchedulingCronHandler() {
    packageUpdateScheduling(databaseConnection!);
}

async function packageUpdateScheduling(connection: Connection) {
    
    /** Find packages ready for updates */
}
