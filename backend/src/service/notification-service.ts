import { Connection } from "typeorm";
import { NotificationFrequency } from "../generated/graphql";
import { FollowRepository } from "../repository/FollowRepository";
import { combineNotifications, Notification } from "../util/notificationUtil";
import { CronJob } from "cron";
import { PlatformStateRepository } from "../repository/PlatformStateRepository";
import { PlatformStateEntity } from "../entity/PlatformStateEntity";

let databaseConnection: Connection | null;

const dailyJob = new CronJob("0 0 8 1/1 * *", dailyNotifications, null, false, "America/New_York");
const weeklyJob = new CronJob("0 0 8 1/1 * MON", weeklyNotifications, null, false, "America/New_York");

export function startNotificationService(connection: Connection) {
    databaseConnection = connection;
    dailyJob.start();
    weeklyJob.start();
}

export async function stopNotificationService() {
    dailyJob.stop();
    weeklyJob.start();
}

export async function dailyNotifications() {
    await prepareAndSendNotifications("lastDailyNotificationDate", NotificationFrequency.DAILY);
}

export async function weeklyNotifications() {
    await prepareAndSendNotifications("lastWeeklyNotificationDate", NotificationFrequency.WEEKLY);
}

async function prepareAndSendNotifications(stateKey: string, frequency: NotificationFrequency) {
    const result = await databaseConnection?.getCustomRepository(PlatformStateRepository).findStateByKey(stateKey);

    let lastNotificationDate = new Date(new Date().getTime() - 1000);

    if (result) {
        lastNotificationDate = new Date(result.serializedState);
    }

    const now = new Date();

    try {
        await sendNotifications(
            NotificationFrequency.DAILY,
            lastNotificationDate,
            now,
            databaseConnection as Connection
        );
    } catch (error) {
        console.error("There was an error sending " + frequency + " notifications!");
        console.error(error);
    } finally {
        await databaseConnection?.transaction(async (entityManager) => {
            if (result) {
                result.serializedState = now.toISOString();
                await entityManager.save(result);
            } else {
                const newValue = entityManager.create(PlatformStateEntity);
                newValue.key = stateKey;
                newValue.serializedState = now.toISOString();
                await entityManager.save([newValue]);
            }
        });
    }
}

async function sendNotifications(
    frequency: NotificationFrequency,
    startDate: Date,
    endDate: Date,
    connection: Connection
) {
    const pendingNotifications = await getPendingNotification(connection, frequency, startDate, endDate);
}

/** Returns pending notifications for each user based on the start and end date range of the actions
 * taken.
 */
async function getPendingNotification(
    databaseConnection: Connection,
    frequency: NotificationFrequency,
    startDate: Date,
    endDaate: Date
): Promise<Notification[]> {
    const pendingCatalogNotifications = databaseConnection?.manager
        .getCustomRepository(FollowRepository)
        .getCatalogFollowsForNotifications(startDate, endDaate, frequency);

    const [catalogNotifications] = await Promise.all([pendingCatalogNotifications]);

    const allNotifications = catalogNotifications; // todo combine others

    const notificationsByUser: Record<number, Notification> = {};

    allNotifications.forEach((v) => {
        if (notificationsByUser[v.userId] == null) {
            notificationsByUser[v.userId] = v;
            return;
        }

        combineNotifications(notificationsByUser[v.userId], v);
    });

    return Object.values(notificationsByUser);
}
