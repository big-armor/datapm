import { Connection, EntityManager, EntityRepository } from "typeorm";
import { ActivityLogEntity } from "../entity/ActivityLogEntity";
import { ActivityLogChangeType, ActivityLogEventType } from "../entity/ActivityLogEventType";
import { CatalogEntity } from "../entity/CatalogEntity";
import { CollectionEntity } from "../entity/CollectionEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { UserEntity } from "../entity/UserEntity";
import { VersionEntity } from "../entity/VersionEntity";

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
    const activityLog = new ActivityLogEntity();
    activityLog.eventType = activityLogTemp.eventType;
    activityLog.changeType = activityLogTemp.changeType;
    activityLog.userId = activityLogTemp.userId;
    activityLog.targetPackageId = activityLogTemp.targetPackageId;
    activityLog.targetPackageVersionId = activityLogTemp.targetPackageVersionId;
    activityLog.targetCatalogId = activityLogTemp.targetCatalogId;
    activityLog.targetCollectionId = activityLogTemp.targetCollectionId;
    activityLog.propertiesEdited = activityLogTemp.propertiesEdited;

    if (activityLogTemp.userId) {
        const user = await connection.getRepository(UserEntity).findOneOrFail({ id: activityLogTemp.userId });

        activityLog.username = user.username;
    }

    if (activityLogTemp.targetPackageId) {
        const packageEntity = await connection
            .getRepository(PackageEntity)
            .findOneOrFail({ id: activityLogTemp.targetPackageId }, { relations: ["catalog"] });

        activityLog.targetPackageIdentifier = packageEntity.catalog.slug + "/" + packageEntity.slug;
    }

    if (activityLogTemp.targetPackageVersionId) {
        const version = await connection
            .getRepository(VersionEntity)
            .findOneOrFail({ id: activityLogTemp.targetPackageVersionId });

        activityLog.targetVersionNumber = `${version?.majorVersion}.${version?.minorVersion}.${version?.patchVersion}`;
    }

    if (activityLogTemp.targetCatalogId) {
        const catalog = await connection
            .getRepository(CatalogEntity)
            .findOneOrFail({ id: activityLogTemp.targetCatalogId });

        activityLog.targetCatalogSlug = catalog.slug;
    }

    if (activityLogTemp.targetCollectionId) {
        const collection = await connection
            .getRepository(CollectionEntity)
            .findOneOrFail({ id: activityLogTemp.targetCollectionId });

        activityLog.targetCollectionSlug = collection.collectionSlug;
    }

    await connection.getCustomRepository(ActivityLogRepository).create(activityLog);
}
@EntityRepository(ActivityLogEntity)
export class ActivityLogRepository {
    constructor(private manager: EntityManager) {}

    async create(activityLog: ActivityLogEntity): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const entity = transaction.create(ActivityLogEntity, activityLog);
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
