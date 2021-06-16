import { Connection, EntityManager, EntityRepository, In, Repository } from "typeorm";
import { ActivityLogEntity } from "../entity/ActivityLogEntity";
import { CatalogEntity } from "../entity/CatalogEntity";
import { CollectionEntity } from "../entity/CollectionEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { UserEntity } from "../entity/UserEntity";
import { VersionEntity } from "../entity/VersionEntity";
import { ActivityLogChangeType, ActivityLogEventType } from "../generated/graphql";

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

    await connection.getCustomRepository(ActivityLogRepository).createLog(activityLog);
}
@EntityRepository(ActivityLogEntity)
export class ActivityLogRepository extends Repository<ActivityLogEntity> {
    async createLog(activityLog: ActivityLogEntity): Promise<void> {
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

    async getUserFollowingActivity(
        userId: number,
        limit: number,
        offset: number,
        relations?: string[]
    ): Promise<[ActivityLogEntity[], number]> {
        if (relations == null) {
            relations = [];
        }

        if (!relations?.includes("targetCollection")) {
            relations.push("targetCollection");
        }

        const alias = "AuditLog";
        // return await this.manager.query(updatesQuery, [userId, limit, offset]);
        // return await this.manager.createQueryBuilder()
        //     .innerJoin(alias, "f", "f.", {}).getMany();
        // (updatesQuery, [userId, limit, offset]);

        const logs = [
            {
                id: 1,
                user: {
                    username: "ermali",
                    firstName: "Ermal",
                    lastName: "Ferati"
                },
                targetPackageId: 16,
                eventType: ActivityLogEventType.PACKAGE_CREATED,
                createdAt: new Date(),
                updatedAt: new Date()
            } as ActivityLogEntity,
            {
                id: 2,
                user: {
                    username: "ermali",
                    firstName: "Ermal",
                    lastName: "Ferati",
                    nameIsPublic: true
                },
                targetCatalogId: 1,
                eventType: ActivityLogEventType.CATALOG_CREATED,
                createdAt: new Date(),
                updatedAt: new Date()
            } as ActivityLogEntity,
            {
                id: 3,
                user: {
                    username: "ermali2",
                    firstName: "Ermal2",
                    lastName: "Ferati",
                    nameIsPublic: true
                },
                targetCollectionId: 19,
                eventType: ActivityLogEventType.COLLECTION_CREATED,
                createdAt: new Date(),
                updatedAt: new Date()
            } as ActivityLogEntity,
            {
                id: 4,
                user: {
                    username: "ermali1",
                    firstName: "Ermal1",
                    lastName: "Ferati",
                    nameIsPublic: true
                },
                targetPackageIssueId: 1,
                eventType: ActivityLogEventType.PACKAGE_ISSUE_CREATED,
                createdAt: new Date(),
                updatedAt: new Date()
            } as ActivityLogEntity
        ];
        // return Promise.resolve([logs, logs.length]);
        return this.createQueryBuilder()
            .where({
                userId: 1,
                eventType: In([
                    ActivityLogEventType.COLLECTION_PACKAGE_ADDED,
                    ActivityLogEventType.COLLECTION_PACKAGE_REMOVED,
                    ActivityLogEventType.PACKAGE_CREATED,
                    ActivityLogEventType.PACKAGE_DELETED,
                    ActivityLogEventType.COLLECTION_CREATED,
                    ActivityLogEventType.COLLECTION_DELETED
                ])
            })
            .offset(offset)
            .limit(limit)
            .orderBy('"ActivityLogEntity"."created_at"', "DESC")
            .getManyAndCount();
    }
}

const updatesQuery = `
        SELECT DISTINCT (a.id), a.*
        FROM activity_log a
        JOIN LATERAL (
            SELECT f.event_types, f.target_collection_id
            FROM follow f
            WHERE f.target_collection_id  = a.target_collection_id
            AND f.user_id = $1
            AND a.event_type IN (SELECT * FROM unnest(f.event_types))
            AND
            CASE
                WHEN f.target_collection_id IS NOT NULL THEN
                    (
                        (SELECT c.is_public FROM collection c WHERE c.id = a.target_collection_id) IS TRUE
                        OR EXISTS (SELECT cu.collection_id FROM collection_user cu WHERE a.target_collection_id = cu.collection_id AND cu.user_id = f.user_id)
                    )
                WHEN f.target_catalog_id IS NOT NULL THEN
                    (
                        (SELECT c."isPublic" FROM catalog c WHERE c.id = a.target_catalog_id) IS TRUE
                        OR EXISTS (SELECT cu.catalog_id FROM user_catalog cu WHERE a.target_catalog_id = cu.catalog_id AND cu.user_id = f.user_id)
                    )
                WHEN f.target_package_issue_id IS NOT NULL THEN
                    (
                        (SELECT c."isPublic" FROM catalog c WHERE c.id = a.target_catalog_id) IS TRUE
                        OR EXISTS (SELECT cu.catalog_id FROM user_catalog cu WHERE a.target_catalog_id = cu.catalog_id AND cu.user_id = f.user_id)
                    )
                END
                    AND (
                        CASE
                            WHEN a.target_package_id IS NULL THEN TRUE
                            WHEN a.target_package_id IS NOT NULL THEN
                                (SELECT pkg."isPublic" FROM package pkg WHERE pkg.id = a.target_package_id) IS TRUE
                                OR EXISTS (SELECT pu.package_id FROM user_package_permission pu WHERE a.target_package_id = pu.package_id AND pu.user_id = f.user_id
                            )
                        END
                    )
        ) f ON TRUE
        ORDER BY a.created_at DESC
        LIMIT $2
        OFFSET $3;
`;
