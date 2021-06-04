import { Connection } from "typeorm";
import { ActivityLogEventType, NotificationFrequency, Permission } from "../generated/graphql";
import { FollowRepository } from "../repository/FollowRepository";
import { combineNotifications, Notification } from "../util/notificationUtil";
import { CronJob } from "cron";
import { PlatformStateRepository } from "../repository/PlatformStateRepository";
import { PlatformStateEntity } from "../entity/PlatformStateEntity";
import { UserRepository } from "../repository/UserRepository";
import { NotificationEmail, sendFollowNotificationEmail } from "../util/smtpUtil";
import { CatalogRepository } from "../repository/CatalogRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { hasPackageEntityPermissions } from "../resolvers/UserPackagePermissionResolver";

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
    const pendingNotifications = await getPendingNotification(connection, frequency, startDate, endDate);

    for (const notification of pendingNotifications) {
        const user = await connection.getCustomRepository(UserRepository).findOneOrFail({
            where: {
                id: notification.userId
            }
        });

        const notificationEmail: NotificationEmail = {
            username: user.username,
            firstName: user.firstName || "",
            frequency: frequency.toString().toLowerCase(),
            catalogs: await Promise.all(
                notification.catalogNotifications.map(async (n) => {
                    const catalogEntity = await connection
                        .getCustomRepository(CatalogRepository)
                        .findOneOrFail(n.catalogId);

                    const editedAction = n.actions.find((n) => n.event_type == ActivityLogEventType.CATALOG_EDIT);

                    const edited = editedAction != null;

                    let madePublic = false;
                    let madeNotPublic = false;
                    if (editedAction?.properties_edited.includes("public")) {
                        if (catalogEntity.isPublic) {
                            madePublic = true;
                        } else {
                            madeNotPublic = true;
                        }
                    }

                    const editedBy = await Promise.all(
                        n.actions
                            .find((n) => n.event_type == ActivityLogEventType.CATALOG_EDIT)
                            ?.action_users.map(async (u) => {
                                const editorEntity = await connection
                                    .getCustomRepository(UserRepository)
                                    .findOneOrFail(u);

                                return {
                                    username: editorEntity.username,
                                    usernameOrName: editorEntity.displayName
                                };
                            }) || []
                    );

                    let packagesAdded: {
                        packageSlug: string;
                        catalogSlug: string;
                    }[] = [];

                    try {
                        packagesAdded = await Promise.all(
                            n.actions
                                .find((n) => n.event_type === ActivityLogEventType.CATALOG_PACKAGE_ADDED)
                                ?.package_ids.map(async (p) => {
                                    const packageEntity = await connection
                                        .getCustomRepository(PackageRepository)
                                        .findPackageByIdOrFail({ packageId: p, relations: ["catalog"] });

                                    return {
                                        catalogSlug: packageEntity.catalog.slug,
                                        packageSlug: packageEntity.slug
                                    };
                                }) || []
                        );

                        packagesAdded = await packagesAdded.asyncFilter(async (p) => {
                            const packageEntity = await connection
                                .getCustomRepository(PackageRepository)
                                .findPackageOrFail({
                                    identifier: p
                                });

                            const hasViewPermission = await hasPackageEntityPermissions(
                                connection,
                                user,
                                packageEntity,
                                Permission.VIEW
                            );

                            return hasViewPermission;
                        });
                    } catch (error) {
                        console.error(error);
                    }

                    let packagesRemoved: {
                        name: string;
                    }[] = [];
                    try {
                        packagesAdded = await Promise.all(
                            n.actions
                                .find((n) => n.event_type === ActivityLogEventType.CATALOG_PACKAGE_REMOVED)
                                ?.package_ids.map(async (p) => {
                                    const packageEntity = await connection
                                        .getCustomRepository(PackageRepository)
                                        .findPackageByIdOrFail({ packageId: p, relations: ["catalog"] });

                                    return {
                                        catalogSlug: packageEntity.catalog.slug,
                                        packageSlug: packageEntity.slug
                                    };
                                }) || []
                        );

                        packagesAdded = await packagesAdded.asyncFilter(async (p) => {
                            const packageEntity = await connection
                                .getCustomRepository(PackageRepository)
                                .findPackageOrFail({
                                    identifier: p
                                });

                            const hasViewPermission = await hasPackageEntityPermissions(
                                connection,
                                user,
                                packageEntity,
                                Permission.VIEW
                            );

                            return hasViewPermission;
                        });
                    } catch (error) {
                        console.error(error);
                    }

                    return {
                        madePublic,
                        madeNotPublic,
                        changedSlug: editedAction?.properties_edited.includes("slug"),
                        changedName: editedAction?.properties_edited.includes("displayName"),
                        changedDescription: editedAction?.properties_edited.includes("description"),
                        displayName: catalogEntity.displayName,
                        slug: catalogEntity.slug,
                        editedBy: editedBy,
                        edited,
                        hasPackagesAdded: packagesAdded.length > 0,
                        packagesAdded,
                        hasPackagesRemoved: false,
                        packagesRemoved: [] // TODO - database doesn't keep removed packages
                    };
                })
            )
        };

        sendFollowNotificationEmail(user, frequency, notificationEmail);
    }
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
