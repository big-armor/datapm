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
import { UserEntity } from "../entity/UserEntity";
import { VersionEntity } from "../entity/VersionEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { CollectionRepository } from "../repository/CollectionRepository";
import { hasPackagePermissionForEntity } from "../directive/hasPackagePermissionDirective";
import { Context } from "../context";
import { SessionCache } from "../session-cache";

let databaseConnection: Connection | null;

const instantJob = new CronJob("1/1 * * * *", instantNotificationJob, null, false, "America/New_York");
const hourlyJob = new CronJob("0 1/1 * * *", hourlyNotificationsJob, null, false, "America/New_York");
const dailyJob = new CronJob("0 0 8 * * *", dailyNotificationsJob, null, false, "America/New_York");
const weeklyJob = new CronJob("0 0 8 * * MON", weeklyNotificationsJob, null, false, "America/New_York");
const monthlyJob = new CronJob("0 0 12 1 * *", monthlyNotificationsJob, null, false, "America/New_York");

export function startNotificationService(connection: Connection): void {
    databaseConnection = connection;
    instantJob.start();
    hourlyJob.start();
    dailyJob.start();
    weeklyJob.start();
    monthlyJob.start();
}

export function stopNotificationService(): void {
    instantJob.stop();
    hourlyJob.stop();
    dailyJob.stop();
    weeklyJob.stop();
    monthlyJob.stop();
}

async function instantNotificationJob() {
    if (databaseConnection == null) throw new Error("Database connection is null!");

    instantNotifications(databaseConnection);
}

async function hourlyNotificationsJob() {
    if (databaseConnection == null) throw new Error("Database connection is null!");

    hourlyNotifications(databaseConnection);
}

async function dailyNotificationsJob() {
    if (databaseConnection == null) throw new Error("Database connection is null!");

    dailyNotifications(databaseConnection);
}

async function weeklyNotificationsJob() {
    if (databaseConnection == null) throw new Error("Database connection is null!");

    weeklyNotifications(databaseConnection);
}

async function monthlyNotificationsJob() {
    if (databaseConnection == null) throw new Error("Database connection is null!");

    monthlyNotifications(databaseConnection);
}

export async function instantNotifications(databaseConnection: Connection): Promise<void> {
    await prepareAndSendNotifications(databaseConnection, "lastInstantNotificationDate", NotificationFrequency.INSTANT);
}

export async function hourlyNotifications(databaseConnection: Connection): Promise<void> {
    await prepareAndSendNotifications(databaseConnection, "lastHourlyNotificationDate", NotificationFrequency.HOURLY);
}

export async function dailyNotifications(databaseConnection: Connection): Promise<void> {
    await prepareAndSendNotifications(databaseConnection, "lastDailyNotificationDate", NotificationFrequency.DAILY);
}

export async function weeklyNotifications(databaseConnection: Connection): Promise<void> {
    await prepareAndSendNotifications(databaseConnection, "lastWeeklyNotificationDate", NotificationFrequency.WEEKLY);
}

export async function monthlyNotifications(databaseConnection: Connection): Promise<void> {
    await prepareAndSendNotifications(databaseConnection, "lastMonthlyNotificationDate", NotificationFrequency.MONTHLY);
}

async function prepareAndSendNotifications(
    databaseConnection: Connection,
    stateKey: string,
    frequency: NotificationFrequency
) {
    const result = await databaseConnection.getCustomRepository(PlatformStateRepository).findStateByKey(stateKey);

    let lastNotificationDate = new Date(new Date().getTime() - 60 * 1000);

    if (frequency === NotificationFrequency.DAILY) {
        lastNotificationDate = new Date(new Date().getTime() - 24 * 60 * 60 * 1000);
    } else if (frequency === NotificationFrequency.HOURLY) {
        lastNotificationDate = new Date(new Date().getTime() - 1 * 60 * 60 * 1000);
    } else if (frequency === NotificationFrequency.WEEKLY) {
        lastNotificationDate = new Date(new Date().getTime() - 7 * 24 * 60 * 60 * 1000);
    } else if (frequency === NotificationFrequency.MONTHLY) {
        lastNotificationDate = new Date(new Date().getTime() - 30 * 24 * 60 * 60 * 1000);
    }

    if (result) {
        lastNotificationDate = new Date(result.serializedState);
    }

    const now = new Date();

    try {
        await sendNotifications(frequency, lastNotificationDate, now, databaseConnection as Connection);
    } catch (error) {
        console.error("There was an error sending " + frequency + " notifications!");
        console.error(error);
    } finally {
        await databaseConnection.transaction(async (entityManager) => {
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

        const context: Context = {
            cache: new SessionCache(),
            connection: connection
        };

        const catalogChanges = await getCatalogChanges(user, notification, context);
        const packageChanges = await getPackageChanges(user, notification, context);
        const collectionChanges = await getCollectionChanges(user, notification, context);
        const userChanges = await getUserChanges(user, notification, connection);

        const notificationEmail: NotificationEmailTemplate = {
            recipientFirstName: user.firstName,
            frequency: frequency.toString().toLowerCase(),
            hasCatalogChanges: catalogChanges.length > 0,
            catalogs: catalogChanges,
            hasPackageChanges: packageChanges.length > 0,
            packages: packageChanges,
            hasCollectionChanges: collectionChanges.length > 0,
            collections: collectionChanges,
            hasUserChanges: userChanges.length > 0,
            users: userChanges
        };

        await sendFollowNotificationEmail(user, frequency, notificationEmail);
    }
}

async function getUserChanges(
    notificationUser: UserEntity,
    notification: Notification,
    connection: Connection
): Promise<NotificationResourceTypeTemplate[]> {
    return await Promise.all(
        (await notification.userNotifications?.asyncMap(async (pn) => {
            const userEntity = await connection.getRepository(UserEntity).findOneOrFail(pn.userId);

            return {
                displayName: userEntity.displayName,
                slug: userEntity.username,
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

                    const userDisplayName = "";
                    const action = "took an unknown action";

                    const timeAgo = "unknown time ago";

                    if (n.event_type === ActivityLogEventType.VERSION_CREATED) {
                        actionsTaken = actionsTaken.concat(
                            await n.actions.asyncMap(async (a) => {
                                const version = await connection.getRepository(VersionEntity).findOneOrFail({
                                    where: { id: a.package_version_id },
                                    relations: ["package", "package.catalog"]
                                });

                                const actionTemplate = new NotificationActionTemplate({
                                    prefix: "published ",
                                    itemSlug: version.package.catalog.slug + "/" + version.package.slug,
                                    itemName: version.package.catalog.slug + "/" + version.package.slug,
                                    postfix:
                                        " version " +
                                        version.majorVersion +
                                        "." +
                                        version.minorVersion +
                                        "." +
                                        version.patchVersion,
                                    userDisplayName: userDisplayName,
                                    userSlug: user.username
                                });

                                return actionTemplate;
                            })
                        );
                    } // TODO support CREATE_COLLECTION action. Requires some consideration for when the collection is made public
                    // must filter out collections that the notification reciever doesn't have access to.

                    return actionsTaken;
                })
            };
        })) || []
    );
}

async function getPackageChanges(
    user: UserEntity,
    notification: Notification,
    context: Context
): Promise<NotificationResourceTypeTemplate[]> {
    const values = await Promise.all(
        (await notification.packageNotifications?.asyncMap(async (pn) => {
            const packageEntity = await context.connection
                .getRepository(PackageEntity)
                .findOneOrFail(pn.packageId, { relations: ["catalog"] });

            const hasPermission = await hasPackagePermissionForEntity(Permission.VIEW, context, packageEntity);

            if (!hasPermission) {
                return null;
            }

            return {
                displayName: packageEntity.displayName,
                slug: packageEntity.catalog.slug + "/" + packageEntity.slug,
                actions: await pn.pending_notifications.asyncFlatMap(async (n) => {
                    let actionsTaken: NotificationActionTemplate[] = [];

                    const user = await context.connection.getRepository(UserEntity).findOne({
                        where: {
                            id: n.actions[0].user_id
                        }
                    });

                    if (user == null) {
                        throw new Error("USER_NOT_FOUND_DURING_ACTIVITY_LOOKUP");
                    }

                    let userDisplayName = user?.displayName;

                    const uniqueUsers = [
                        ...new Set(n.actions.map((a) => a.user_id).filter((f) => f !== n.actions[0].user_id))
                    ];
                    if (uniqueUsers.length > 1) {
                        userDisplayName += " and " + uniqueUsers.length + " other users";
                    }

                    if (n.event_type === ActivityLogEventType.PACKAGE_EDIT) {
                        const alertableProperties = n.properties_edited.filter((p) =>
                            ["description", "displayName", "slug"].includes(p)
                        );

                        actionsTaken.push(
                            new NotificationActionTemplate({
                                prefix: "edited " + alertableProperties.join(", "),
                                userDisplayName: userDisplayName,
                                userSlug: user.username
                            })
                        );

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type === ActivityLogChangeType.PUBLIC_ENABLED)
                                .map((p) => {
                                    return new NotificationActionTemplate({
                                        prefix: " enabled public access!",
                                        userDisplayName: userDisplayName,
                                        userSlug: user.username
                                    });
                                })
                        );

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type === ActivityLogChangeType.PUBLIC_DISABLED)
                                .map((p) => {
                                    return new NotificationActionTemplate({
                                        prefix: " disabled public access",
                                        userDisplayName: userDisplayName,
                                        userSlug: user.username
                                    });
                                })
                        );
                    } else if (n.event_type === ActivityLogEventType.VERSION_CREATED) {
                        actionsTaken = actionsTaken.concat(
                            await n.actions.asyncMap(async (a) => {
                                const version = await context.connection
                                    .getRepository(VersionEntity)
                                    .findOneOrFail({ where: { id: a.package_version_id } });

                                return new NotificationActionTemplate({
                                    prefix:
                                        "published version " +
                                        version.majorVersion +
                                        "." +
                                        version.minorVersion +
                                        "." +
                                        version.patchVersion,
                                    userDisplayName: userDisplayName,
                                    userSlug: user.username
                                });
                            })
                        );
                    } else if (n.event_type === ActivityLogEventType.VERSION_DELETED) {
                        actionsTaken = actionsTaken.concat(
                            await n.actions.asyncMap(async (a) => {
                                const version = await context.connection
                                    .getRepository(VersionEntity)
                                    .findOneOrFail({ where: { id: a.package_version_id } });

                                return new NotificationActionTemplate({
                                    prefix:
                                        "deleted version " +
                                        version.majorVersion +
                                        "." +
                                        version.minorVersion +
                                        "." +
                                        version.patchVersion,
                                    userDisplayName: userDisplayName,
                                    userSlug: user.username
                                });
                            })
                        );
                    }

                    return actionsTaken;
                })
            };
        })) || []
    );

    return values.filter((f) => f != null) as NotificationResourceTypeTemplate[];
}

async function getCatalogChanges(
    user: UserEntity,
    notification: Notification,
    context: Context
): Promise<NotificationResourceTypeTemplate[]> {
    return await Promise.all(
        (await notification.catalogNotifications?.asyncMap(async (cn) => {
            const catalogEntity = await context.connection
                .getCustomRepository(CatalogRepository)
                .findOneOrFail(cn.catalogId);

            return {
                displayName: catalogEntity.displayName,
                slug: catalogEntity.slug,
                actions: await cn.pending_notifications.asyncFlatMap(async (n) => {
                    let actionsTaken: NotificationActionTemplate[] = [];

                    const user = await context.connection.getRepository(UserEntity).findOne({
                        where: {
                            id: n.actions[0].user_id
                        }
                    });

                    if (user == null) {
                        throw new Error("USER_NOT_FOUND_DURING_ACTIVITY_LOOKUP");
                    }

                    let userDisplayName = user?.displayName;
                    const action = "took an unknown action";

                    const uniqueUsers = [
                        ...new Set(n.actions.map((a) => a.user_id).filter((f) => f !== n.actions[0].user_id))
                    ];
                    if (uniqueUsers.length > 1) {
                        userDisplayName += " and " + uniqueUsers.length + " other users";
                    }

                    const timeAgo = "unknown time ago";

                    if (n.event_type === ActivityLogEventType.CATALOG_EDIT) {
                        const alertableProperties = n.properties_edited.filter((p) =>
                            ["description", "displayName", "slug", "website"].includes(p)
                        );

                        actionsTaken.push(
                            new NotificationActionTemplate({
                                prefix: "edited " + alertableProperties.join(", "),
                                userDisplayName: userDisplayName,
                                userSlug: user.username
                            })
                        );

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type === ActivityLogChangeType.PUBLIC_ENABLED)
                                .map((p) => {
                                    return new NotificationActionTemplate({
                                        prefix: "enabled public access!",
                                        userDisplayName: userDisplayName,
                                        userSlug: user.username
                                    });
                                })
                        );

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type === ActivityLogChangeType.PUBLIC_DISABLED)
                                .map((p) => {
                                    return new NotificationActionTemplate({
                                        prefix: "disabled public access",
                                        userDisplayName: userDisplayName,
                                        userSlug: user.username
                                    });
                                })
                        );
                    } else if (n.event_type === ActivityLogEventType.CATALOG_PACKAGE_ADDED) {
                        actionsTaken = actionsTaken.concat(
                            await n.actions.asyncFlatMap(async (a) => {
                                const packageEntity = await context.connection
                                    .getRepository(PackageEntity)
                                    .findOneOrFail({ where: { id: a.package_id } });

                                const hasPermission = await hasPackagePermissionForEntity(
                                    Permission.VIEW,
                                    context,
                                    packageEntity
                                );

                                if (!hasPermission) {
                                    return [];
                                }

                                return [
                                    new NotificationActionTemplate({
                                        prefix: `added package`,
                                        itemName: `${catalogEntity.slug}/${packageEntity.slug}`,
                                        itemSlug: `${catalogEntity.slug}/${packageEntity.slug}`,
                                        userDisplayName: userDisplayName,
                                        userSlug: user.username
                                    })
                                ];
                            })
                        );
                    } // Can not include CATALOG_PACKAGE_REMOVED because we don't know who had permission to view it once it's deleted
                    // include CATALOG_PACKAGE_REMOVED in instant notifications

                    return actionsTaken;
                })
            };
        })) || []
    );
}

async function getCollectionChanges(
    user: UserEntity,
    notification: Notification,
    context: Context
): Promise<NotificationResourceTypeTemplate[]> {
    return await Promise.all(
        (await notification.collectionNotifications?.asyncMap(async (cn) => {
            const collectionEntity = await context.connection
                .getCustomRepository(CollectionRepository)
                .findOneOrFail(cn.collectionId);

            return {
                displayName: collectionEntity.name,
                slug: collectionEntity.collectionSlug,
                actions: await cn.pending_notifications.asyncFlatMap(async (n) => {
                    let actionsTaken: NotificationActionTemplate[] = [];

                    const user = await context.connection.getRepository(UserEntity).findOne({
                        where: {
                            id: n.actions[0].user_id
                        }
                    });

                    if (user == null) {
                        throw new Error("USER_NOT_FOUND_DURING_ACTIVITY_LOOKUP");
                    }

                    let userDisplayName = user?.displayName;
                    const action = "took an unknown action";

                    const uniqueUsers = [
                        ...new Set(n.actions.map((a) => a.user_id).filter((f) => f !== n.actions[0].user_id))
                    ];
                    if (uniqueUsers.length > 1) {
                        userDisplayName += " and " + uniqueUsers.length + " other users";
                    }

                    const timeAgo = "unknown time ago";

                    if (n.event_type === ActivityLogEventType.COLLECTION_EDIT) {
                        const alertableProperties = n.properties_edited.filter((p) =>
                            ["description", "name", "collectionSlug"].includes(p)
                        );

                        actionsTaken.push(
                            new NotificationActionTemplate({
                                prefix: "edited " + alertableProperties.join(", "),
                                userDisplayName: userDisplayName,
                                userSlug: user.username
                            })
                        );

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type === ActivityLogChangeType.PUBLIC_ENABLED)
                                .map((p) => {
                                    return new NotificationActionTemplate({
                                        prefix: "enabled public access!",
                                        userDisplayName: userDisplayName,
                                        userSlug: user.username
                                    });
                                })
                        );

                        actionsTaken = actionsTaken.concat(
                            n.actions
                                .filter((a) => a.change_type === ActivityLogChangeType.PUBLIC_DISABLED)
                                .map((p) => {
                                    return new NotificationActionTemplate({
                                        prefix: "disabled public access",
                                        userDisplayName: userDisplayName,
                                        userSlug: user.username
                                    });
                                })
                        );
                    } else if (n.event_type === ActivityLogEventType.COLLECTION_PACKAGE_ADDED) {
                        actionsTaken = actionsTaken.concat(
                            await n.actions.asyncFlatMap(async (a) => {
                                const packageEntity = await context.connection
                                    .getRepository(PackageEntity)
                                    .findOneOrFail({ where: { id: a.package_id }, relations: ["catalog"] });

                                const hasPermission = await hasPackagePermissionForEntity(
                                    Permission.VIEW,
                                    context,
                                    packageEntity
                                );

                                if (!hasPermission) {
                                    return [];
                                }

                                return [
                                    new NotificationActionTemplate({
                                        prefix: `added package`,
                                        itemName: `${packageEntity.catalog.slug}/${packageEntity.slug}`,
                                        itemSlug: `${packageEntity.catalog.slug}/${packageEntity.slug}`,
                                        userDisplayName: userDisplayName,
                                        userSlug: user.username
                                    })
                                ];
                            })
                        );
                    } // Can not include COLLECTION_PACKAGE_REMOVED because we don't know who had permission to view it once it's deleted
                    // include COLLECTION_PACKAGE_REMOVED in instant notifications

                    return actionsTaken;
                })
            };
        })) || []
    );
}

/**
 * Returns pending notifications for each user based on the start and end date range of the actions taken.
 */
async function getPendingNotifications(
    databaseConnection: Connection,
    frequency: NotificationFrequency,
    startDate: Date,
    endDaate: Date
): Promise<Notification[]> {
    const pendingCatalogNotifications = databaseConnection.manager
        .getCustomRepository(FollowRepository)
        .getCatalogFollowsForNotifications(startDate, endDaate, frequency);

    const pendingPackageNotificaitons = databaseConnection.manager
        .getCustomRepository(FollowRepository)
        .getPackageFollowsForNotifications(startDate, endDaate, frequency);

    const pendingCollectionNotificaitons = databaseConnection.manager
        .getCustomRepository(FollowRepository)
        .getCollectionFollowsForNotifications(startDate, endDaate, frequency);

    const pendingUserNotificaitons = databaseConnection.manager
        .getCustomRepository(FollowRepository)
        .getUserFollowsForNotifications(startDate, endDaate, frequency);

    const [catalogNotifications, packageNotifications, collectionNotifications, userNotifications] = await Promise.all([
        pendingCatalogNotifications,
        pendingPackageNotificaitons,
        pendingCollectionNotificaitons,
        pendingUserNotificaitons
    ]);

    const allNotifications = catalogNotifications
        .concat(packageNotifications)
        .concat(collectionNotifications)
        .concat(userNotifications);

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
