import { Connection, EntityManager, EntityRepository } from "typeorm";
import { ActivityLog } from "../entity/ActivityLog";
import { ActivityLogChangeType, ActivityLogEventType } from "../entity/ActivityLogEventType";
import { Catalog } from "../entity/Catalog";
import { Collection } from "../entity/Collection";
import { Package } from "../entity/Package";
import { User } from "../entity/User";
import { Version } from "../entity/Version";

export interface ActivityLogTemp {
    userId: number;
    eventType: ActivityLogEventType;
    changeType?: ActivityLogChangeType;
    targetPackageId?: number;
    targetPackageVersionId?: number;
    targetCatalogId?: number;
    targetCollectionId?: number;
    propertiesEdited?: string[];
}

/** Creates a new ActivityLog entry in the database, and logs it */
export async function createActivityLog(connection: EntityManager | Connection, activityLogTemp: ActivityLogTemp) {
    const activityLog = new ActivityLog();
    activityLog.eventType = activityLogTemp.eventType;
    activityLog.changeType = activityLogTemp.changeType;

    if (activityLogTemp.userId) {
        activityLog.userId = activityLogTemp.userId;

        const user = await connection.getRepository(User).findOneOrFail({ id: activityLogTemp.userId });

        activityLog.username = user.username;
    }

    if (activityLogTemp.targetPackageId) {
        activityLog.targetPackageId = activityLogTemp.targetPackageId;

        const packageEntity = await connection
            .getRepository(Package)
            .findOneOrFail({ id: activityLogTemp.targetPackageId }, { relations: ["catalog"] });

        activityLog.targetPackageIdentifier = packageEntity.catalog.slug + "/" + packageEntity.slug;
    }

    if (activityLogTemp.targetPackageVersionId) {
        activityLog.targetPackageVersionId = activityLogTemp.targetPackageVersionId;

        const version = await connection
            .getRepository(Version)
            .findOneOrFail({ id: activityLogTemp.targetPackageVersionId });

        activityLog.targetVersionNumber = `${version?.majorVersion}.${version?.minorVersion}.${version?.patchVersion}`;
    }

    if (activityLogTemp.targetCatalogId) {
        activityLog.targetCatalogId = activityLogTemp.targetCatalogId;

        const catalog = await connection.getRepository(Catalog).findOneOrFail({ id: activityLogTemp.targetCatalogId });

        activityLog.targetCatalogSlug = catalog.slug;
    }

    if (activityLogTemp.targetCollectionId) {
        activityLog.targetCollectionId = activityLogTemp.targetCollectionId;

        const collection = await connection
            .getRepository(Collection)
            .findOneOrFail({ id: activityLogTemp.targetCollectionId });

        activityLog.targetCollectionSlug = collection.collectionSlug;
    }

    activityLog.propertiesEdited = activityLogTemp.propertiesEdited;

    await connection.getCustomRepository(ActivityLogRepository).create(activityLog);
}
@EntityRepository(ActivityLog)
export class ActivityLogRepository {
    constructor(private manager: EntityManager) {}

    async create(activityLog: ActivityLog): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const entity = transaction.create(ActivityLog, activityLog);
            if (
                activityLog.eventType !== ActivityLogEventType.PACKAGE_DELETED &&
                activityLog.eventType !== ActivityLogEventType.VERSION_DELETED &&
                activityLog.eventType !== ActivityLogEventType.COLLECTION_DELETED &&
                activityLog.eventType !== ActivityLogEventType.CATALOG_DELETED &&
                activityLog.eventType !== ActivityLogEventType.USER_DELETED
            ) {
                await transaction.save(entity);
            }

            if (process.env.ACTIVITY_LOG === "true")
                console.info(
                    JSON.stringify({
                        _type: "ActivityLog",
                        date: new Date().toISOString(),
                        ...activityLog
                    })
                );
        });
    }
}
