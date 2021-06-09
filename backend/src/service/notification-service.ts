import { Connection } from "typeorm";
import { ActivityLogChangeType, ActivityLogEventType, NotificationFrequency, Permission } from "../generated/graphql";
import { FollowRepository } from "../repository/FollowRepository";
import { combineNotifications, Notification } from "../util/notificationUtil";
import { CronJob } from "cron";
import { PlatformStateRepository } from "../repository/PlatformStateRepository";
import { PlatformStateEntity } from "../entity/PlatformStateEntity";
import { UserRepository } from "../repository/UserRepository";
import {
    NotificationResourceTypeTemplate,
    NotificationEmailTemplate,
    sendFollowNotificationEmail,
    NotificationActionTemplate
} from "../util/smtpUtil";
import { CatalogRepository } from "../repository/CatalogRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { hasPackageEntityPermissions } from "../resolvers/UserPackagePermissionResolver";
import { UserEntity } from "../entity/UserEntity";
import { VersionRepository } from "../repository/VersionRepository";
import { VersionEntity } from "../entity/VersionEntity";
import { version } from "uuid";
import { PackageEntity } from "../entity/PackageEntity";

let databaseConnection: Connection | null;

const dailyJob = new CronJob("0 0 8 * * *", dailyNotifications, null, false, "America/New_York");
const weeklyJob = new CronJob("0 0 8 * * MON", weeklyNotifications, null, false, "America/New_York");
const monthlyJob = new CronJob("0 0 12 1 * *", monthlyNotifications, null, false, "America/New_York");

export function startNotificationService(connection: Connection) {
    databaseConnection = connection;
    dailyJob.start();
    weeklyJob.start();
    monthlyJob.start();
}

export async function stopNotificationService() {
    dailyJob.stop();
    weeklyJob.stop();
    monthlyJob.stop();
}

export async function dailyNotifications() {
    await prepareAndSendNotifications("lastDailyNotificationDate", NotificationFrequency.DAILY);
}

export async function weeklyNotifications() {
    await prepareAndSendNotifications("lastWeeklyNotificationDate", NotificationFrequency.WEEKLY);
}

export async function monthlyNotifications() {
    await prepareAndSendNotifications("lastMonthlyNotificationDate", NotificationFrequency.MONTHLY);
}

async function prepareAndSendNotifications(stateKey: string, frequency: NotificationFrequency) {
    const result = await databaseConnection?.getCustomRepository(PlatformStateRepository).findStateByKey(stateKey);

    let lastNotificationDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);

    if (result) {
        lastNotificationDate = new Date(result.serializedState);
    }

    // !!!!!!!! REMOVE MOVE ME!!!!!!!!!!!!!!!!!
    console.log("REMOVE THE LINE BELOW THIS! JUST FOR TESTING");
    lastNotificationDate = new Date(0);

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
    const pendingNotifications = await getPendingNotifications(connection, frequency, startDate, endDate);

    for (const notification of pendingNotifications) {
        const user = await connection.getCustomRepository(UserRepository).findOneOrFail({
            where: {
                id: notification.userId
            }
        });

        const catalogChanges = await getCatalogChanges(user, notification, connection);
        const packageChanges = await getPackageChanges(user, notification, connection);

        const notificationEmail: NotificationEmailTemplate = {
            recipientFirstName: user.firstName,
            frequency: frequency.toString().toLowerCase(),
            hasCatalogChanges: catalogChanges.length > 0,
            catalogs: catalogChanges,
            hasPackageChanges: packageChanges.length > 0,
            packages: packageChanges
        };

        sendFollowNotificationEmail(user, frequency, notificationEmail);
    }
}

async function getPackageChanges(
    user: UserEntity,
    notification: Notification,
    connection: Connection
): Promise<NotificationResourceTypeTemplate[]> {
    return await Promise.all(
        (await notification.packageNotifications?.asyncMap(async (pn) => {
            const packageEntity = await connection
                .getRepository(PackageEntity)
                .findOneOrFail(pn.packageId, { relations: ["catalog"] });

            return {
                displayName: packageEntity.displayName,
                slug: packageEntity.catalog.slug + "/" + packageEntity.slug,
                actions: await pn.pending_notifications.asyncFlatMap(async (n) => {
                    let actionsTaken: NotificationActionTemplate[] = [];

                    const user = await connection.getRepository(UserEntity).findOne({
                        where: {
                            id: n.actions[0].user_id
                        }
                    });

                    if (user == null) {
                        throw new Error("USER_NOT_FOUND_DURING_ACTIVITY_LOOKUP");
                    }

                    let userDisplayName = user?.displayName;
                    let action = "took an unknown action";

                    if (n.actions.length > 1) {
                        const uniqueUsers = [
                            ...new Set(n.actions.map((a) => a.user_id).filter((f) => f != n.actions[0].user_id))
                        ];

                        userDisplayName += " and " + uniqueUsers.length + " other users";
                    }

                    const timeAgo = "unknown time ago";

                    if (n.event_type == ActivityLogEventType.PACKAGE_EDIT) {
                        const alertableProperties = n.properties_edited.filter((p) =>
                            ["description", "displayName", "slug"].includes(p)
                        );

                        action = "edited " + alertableProperties.join(", ");

                        actionsTaken.push({
                            action,
                            userDisplayName: userDisplayName,
                            timeAgo
                        });

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type == ActivityLogChangeType.PUBLIC_ENABLED)
                                .map((p) => {
                                    return {
                                        action: " enabled public access!",
                                        userDisplayName: userDisplayName,
                                        timeAgo
                                    };
                                })
                        );

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type == ActivityLogChangeType.PUBLIC_DISABLED)
                                .map((p) => {
                                    return {
                                        action: " disabled public access",
                                        userDisplayName: userDisplayName,
                                        timeAgo
                                    };
                                })
                        );
                    } else if (n.event_type == ActivityLogEventType.VERSION_CREATED) {
                        actionsTaken = actionsTaken.concat(
                            await n.actions.asyncMap(async (a) => {
                                const version = await connection
                                    .getRepository(VersionEntity)
                                    .findOneOrFail({ where: { id: a.package_version_id } });

                                return {
                                    action:
                                        "published version " +
                                        version.majorVersion +
                                        "." +
                                        version.minorVersion +
                                        "." +
                                        version.patchVersion,
                                    userDisplayName: userDisplayName,
                                    timeAgo: "test"
                                };
                            })
                        );
                    }

                    return actionsTaken;
                })
            };
        })) || []
    );
}

async function getCatalogChanges(
    user: UserEntity,
    notification: Notification,
    connection: Connection
): Promise<NotificationResourceTypeTemplate[]> {
    return await Promise.all(
        (await notification.catalogNotifications?.asyncMap(async (cn) => {
            const catalogEntity = await connection.getCustomRepository(CatalogRepository).findOneOrFail(cn.catalogId);

            return {
                displayName: catalogEntity.displayName,
                slug: catalogEntity.slug,
                actions: await cn.pending_notifications.asyncFlatMap(async (n) => {
                    let actionsTaken: NotificationActionTemplate[] = [];

                    const user = await connection.getRepository(UserEntity).findOne({
                        where: {
                            id: n.actions[0].user_id
                        }
                    });

                    if (user == null) {
                        throw new Error("USER_NOT_FOUND_DURING_ACTIVITY_LOOKUP");
                    }

                    let userDisplayName = user?.displayName;
                    let action = "took an unknown action";

                    if (n.actions.length > 1) {
                        const uniqueUsers = [
                            ...new Set(n.actions.map((a) => a.user_id).filter((f) => f != n.actions[0].user_id))
                        ];

                        userDisplayName += " and " + uniqueUsers.length + " other users";
                    }

                    const timeAgo = "unknown time ago";

                    if (n.event_type == ActivityLogEventType.CATALOG_EDIT) {
                        const alertableProperties = n.properties_edited.filter((p) =>
                            ["description", "displayName", "slug", "website"].includes(p)
                        );

                        action = "edited " + alertableProperties.join(", ");

                        actionsTaken.push({
                            action,
                            userDisplayName: userDisplayName,
                            timeAgo
                        });

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type == ActivityLogChangeType.PUBLIC_ENABLED)
                                .map((p) => {
                                    return {
                                        action: "enabled public access!",
                                        userDisplayName: userDisplayName,
                                        timeAgo
                                    };
                                })
                        );

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type == ActivityLogChangeType.PUBLIC_DISABLED)
                                .map((p) => {
                                    return {
                                        action: "disabled public access",
                                        userDisplayName: userDisplayName,
                                        timeAgo
                                    };
                                })
                        );
                    } else if (n.event_type == ActivityLogEventType.CATALOG_PACKAGE_ADDED) {
                        actionsTaken = actionsTaken.concat(
                            await n.actions.asyncFlatMap(async (a) => {
                                const packageEntity = await connection
                                    .getRepository(PackageEntity)
                                    .findOneOrFail({ where: { id: a.package_id } });

                                if (!hasPackageEntityPermissions(connection, user, packageEntity, Permission.VIEW)) {
                                    return [];
                                }

                                return [
                                    {
                                        action: `added package ${catalogEntity.slug}/${packageEntity.slug}`,
                                        userDisplayName: userDisplayName,
                                        timeAgo
                                    }
                                ];
                            })
                        );
                    }

                    return actionsTaken;
                })
            };
        })) || []
    );
}

/** Returns pending notifications for each user based on the start and end date range of the actions
 * taken.
 */
async function getPendingNotifications(
    databaseConnection: Connection,
    frequency: NotificationFrequency,
    startDate: Date,
    endDaate: Date
): Promise<Notification[]> {
    const pendingCatalogNotifications = databaseConnection?.manager
        .getCustomRepository(FollowRepository)
        .getCatalogFollowsForNotifications(startDate, endDaate, frequency);

    const pendingPackageNotificaitons = databaseConnection?.manager
        .getCustomRepository(FollowRepository)
        .getPackageFollowsForNotifications(startDate, endDaate, frequency);

    const [catalogNotifications, packageNotifications] = await Promise.all([
        pendingCatalogNotifications,
        pendingPackageNotificaitons
    ]);

    const allNotifications = catalogNotifications.concat(packageNotifications); // todo combine others

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
