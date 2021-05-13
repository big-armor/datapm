import { Connection, EntityManager, EntityRepository } from "typeorm";
import { ActivityLogEntity } from "../entity/ActivityLogEntity";
import { CatalogEntity } from "../entity/CatalogEntity";
import { CollectionEntity } from "../entity/CollectionEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { UserEntity } from "../entity/UserEntity";
import { VersionEntity } from "../entity/VersionEntity";
import { ActivityLog, ActivityLogChangeType, ActivityLogEventType } from "../generated/graphql";

export interface ActivityLogTemp {
    userId: number;
    eventType: ActivityLogEventType;
    changeType?: ActivityLogChangeType;
    targetPackageId?: number;
    targetPackageIssueId?: number;
    targetPackageVersionId?: number;
    targetCatalogId?: number;
    targetCollectionId?: number;
    targetUserId?: number;
    propertiesEdited?: string[];
}

/** Creates a new ActivityLog entry in the database, and logs it */
export async function createActivityLog(connection: EntityManager | Connection, activityLogTemp: ActivityLogTemp) {
    const activityLog = new ActivityLogEntity();
    activityLog.eventType = activityLogTemp.eventType;
    activityLog.changeType = activityLogTemp.changeType;
    activityLog.userId = activityLogTemp.userId;
    activityLog.targetPackageId = activityLogTemp.targetPackageId;
    activityLog.targetPackageIssueId = activityLogTemp.targetPackageIssueId;
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

    async myRecentlyViewedPackages(
        user: UserEntity,
        limit: number,
        offSet: number,
        relations?: string[]
    ): Promise<[ActivityLogEntity[], number]> {
        if (relations == null) relations = [];

        if (!relations?.includes("targetPackage")) relations.push("targetPackage");

        const [activityLogEntities, count] = await this.manager
            .getRepository(ActivityLogEntity)
            .createQueryBuilder("ActivityLog")
            .where(
                '"ActivityLog"."id" IN ( WITH summary AS ( SELECT "ActivityLog".id as id, "ActivityLog"."created_at" as "created_at",  ROW_NUMBER() OVER(PARTITION BY "ActivityLog".target_package_id  ORDER BY "ActivityLog".created_at DESC) AS rk FROM "public"."activity_log" "ActivityLog" where "ActivityLog".event_type  = \'PACKAGE_VIEWED\' and "ActivityLog".user_id  = :user_id ORDER BY "ActivityLog".created_at DESC LIMIT 1000 ) SELECT s.id FROM summary s WHERE s.rk = 1 order by s.created_at desc )',
                {
                    user_id: user.id
                }
            )
            .orderBy('"ActivityLog"."created_at"', "DESC")
            .limit(limit)
            .offset(offSet)
            .getManyAndCount();

        return [activityLogEntities, count];
    }

    async myRecentlyViewedCollections(
        user: UserEntity,
        limit: number,
        offSet: number,
        relations?: string[]
    ): Promise<[ActivityLogEntity[], number]> {
        if (relations == null) relations = [];

        if (!relations?.includes("targetCollection")) {
            relations.push("targetCollection");
        }

        const [activityLogEntities, count] = await this.manager
            .getRepository(ActivityLogEntity)
            .createQueryBuilder("ActivityLog")
            .where(
                '"ActivityLog"."id" IN ( WITH summary AS ( SELECT "ActivityLog".id as id, "ActivityLog"."created_at" as "created_at",  ROW_NUMBER() OVER(PARTITION BY "ActivityLog".target_collection_id  ORDER BY "ActivityLog".created_at DESC) AS rk FROM "public"."activity_log" "ActivityLog" where "ActivityLog".event_type  = \'COLLECTION_VIEWED\' and "ActivityLog".user_id  = :user_id ORDER BY "ActivityLog".created_at DESC LIMIT 1000 ) SELECT s.id FROM summary s WHERE s.rk = 1 order by s.created_at desc )',
                {
                    user_id: user.id
                }
            )
            .andWhere(
                'EXISTS (SELECT 1 FROM collection_package WHERE collection_id = "ActivityLog".target_collection_id)'
            )
            .orderBy('"ActivityLog"."created_at"', "DESC")
            .limit(limit)
            .offset(offSet)
            .getManyAndCount();

        return [activityLogEntities, count];
    }
}
