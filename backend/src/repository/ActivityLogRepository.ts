import { Connection, DeepPartial, EntityManager, EntityRepository, In, Repository } from "typeorm";
import { ActivityLogEntity } from "../entity/ActivityLogEntity";
import { CatalogEntity } from "../entity/CatalogEntity";
import { CollectionEntity } from "../entity/CollectionEntity";
import { DataBatchEntity } from "../entity/DataBatchEntity";
import { FollowEntity } from "../entity/FollowEntity";
import { GroupEntity } from "../entity/GroupEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { UserEntity } from "../entity/UserEntity";
import { VersionEntity } from "../entity/VersionEntity";
import { ActivityLogChangeType, ActivityLogEventType, Permission } from "../generated/graphql";

export interface ActivityLogTemp {
    userId?: number;
    eventType: ActivityLogEventType;
    changeType?: ActivityLogChangeType;
    targetPackageId?: number;
    targetPackageIssueId?: number;
    targetPackageVersionId?: number;
    targetCatalogId?: number;
    targetCollectionId?: number;
    targetUserId?: number;
    targetGroupId?: number;
    targetDataBatchId?: number;
    propertiesEdited?: string[];
    removedItemName?: string;
    removedItemId?: number;
    permissions?: Permission[];
    additionalProperties?: { [key: string]: unknown };
}

/** Creates a new ActivityLog entry in the database, and logs it */
export async function createActivityLog(
    connection: EntityManager | Connection,
    activityLogTemp: ActivityLogTemp
): Promise<void> {
    const activityLog = new ActivityLogEntity();
    activityLog.eventType = activityLogTemp.eventType;
    activityLog.changeType = activityLogTemp.changeType;
    activityLog.userId = activityLogTemp.userId;
    activityLog.targetPackageId = activityLogTemp.targetPackageId;
    activityLog.targetPackageIssueId = activityLogTemp.targetPackageIssueId;
    activityLog.targetPackageVersionId = activityLogTemp.targetPackageVersionId;
    activityLog.targetCatalogId = activityLogTemp.targetCatalogId;
    activityLog.targetCollectionId = activityLogTemp.targetCollectionId;
    activityLog.targetUserId = activityLogTemp.targetUserId;
    activityLog.targetGroupId = activityLogTemp.targetGroupId;
    activityLog.propertiesEdited = activityLogTemp.propertiesEdited;
    activityLog.removedItemName = activityLogTemp.removedItemName;
    activityLog.removedItemId = activityLogTemp.removedItemId;
    activityLog.additionalProperties = activityLogTemp.additionalProperties;
    activityLog.permissions = activityLogTemp.permissions;

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

    if (activityLogTemp.targetUserId) {
        const user = await connection.getRepository(UserEntity).findOneOrFail({ id: activityLogTemp.targetUserId });

        activityLog.targetUsername = user.username;
    }

    if (activityLogTemp.targetDataBatchId) {
        const batchEntity = await connection
            .getRepository(DataBatchEntity)
            .findOneOrFail({ id: activityLogTemp.targetDataBatchId });

        activityLog.targetBatchNumber = batchEntity.batch;
    }

    if (activityLogTemp.targetGroupId) {
        const group = await connection.getRepository(GroupEntity).findOneOrFail({ id: activityLogTemp.targetGroupId });
        activityLog.targetGroupSlug = group.slug;
    }

    await connection.getCustomRepository(ActivityLogRepository).createLog(activityLog);
}
@EntityRepository(ActivityLogEntity)
export class ActivityLogRepository extends Repository<ActivityLogEntity> {
    async createLog(activityLog: ActivityLogEntity): Promise<void> {
        if (process.env.ACTIVITY_LOG !== "false")
            console.info(
                JSON.stringify({
                    _type: "ActivityLog",
                    date: new Date().toISOString(),
                    ...activityLog
                })
            );

        if (activityLog.userId == null) {
            return;
        }

        return this.manager.nestedTransaction(async (transaction) => {
            const entity = await transaction
                .getRepository(ActivityLogEntity)
                .save(activityLog as DeepPartial<ActivityLogEntity>);
            if (
                activityLog.eventType !== ActivityLogEventType.PACKAGE_DELETED &&
                activityLog.eventType !== ActivityLogEventType.PACKAGE_ISSUE_DELETED &&
                activityLog.eventType !== ActivityLogEventType.VERSION_DELETED &&
                activityLog.eventType !== ActivityLogEventType.COLLECTION_DELETED &&
                activityLog.eventType !== ActivityLogEventType.CATALOG_DELETED &&
                activityLog.eventType !== ActivityLogEventType.USER_DELETED
            ) {
                await transaction.save(entity);
            }
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
        offset: number,
        limit: number,
        relations?: string[]
    ): Promise<[ActivityLogEntity[], number]> {
        if (relations == null) {
            relations = [];
        }

        const alias = "ActivityLog";
        return await this.manager
            .getRepository(ActivityLogEntity)
            .createQueryBuilder(alias)
            .distinct(true)
            .innerJoin(
                (sb) => sb.select('"f".*').from(FollowEntity, "f").where('"f"."user_id" = :userId'),
                "Follow",
                `
                    "ActivityLog"."user_id" != "Follow"."user_id"
                AND "ActivityLog"."event_type" IN (SELECT * FROM unnest("Follow"."event_types"))
                AND
                (
                    "ActivityLog"."user_id" = "Follow"."target_user_id"
                    OR "ActivityLog"."target_collection_id" = "Follow"."target_collection_id"
                    OR "ActivityLog"."target_catalog_id" = "Follow"."target_catalog_id"
                    OR "ActivityLog"."target_package_issue_id" = "Follow"."target_package_issue_id"
                    OR "ActivityLog"."target_package_id" = "Follow"."target_package_id"

                    OR
                    -- Include all package issues of a package if follow_all_package_issues is true on a package/catalog/collection
                    (
                        "Follow"."follow_all_package_issues" IS TRUE
                        AND "ActivityLog"."target_package_issue_id" IS NOT NULL
                        AND
                        (
                            -- Include catalog's packages' issues logs if catalog is not null
                            (
                                "Follow"."target_catalog_id" IS NOT NULL
                                AND "ActivityLog"."target_package_id" IN
                                (
                                    SELECT id
                                    FROM package
                                    WHERE catalog_id = "Follow"."target_catalog_id"
                                )
                            )
                            OR
                            -- Include collection's packages' issues logs if collection is not null
                            (
                                "Follow"."target_collection_id" IS NOT NULL
                                AND "ActivityLog"."target_package_id" IN
                                (
                                    SELECT package_id
                                    FROM collection_package
                                    WHERE collection_id = "Follow"."target_collection_id"
                                )
                            )
                        )
                    )
                    
                    OR
                    -- Include all packages of a catalog/collection if follow_all_packages is true
                    (
                        "Follow"."follow_all_packages" IS TRUE
                        AND "ActivityLog"."target_package_id" IS NOT NULL
                        AND
                        (
                            -- Include catalog's packages logs if catalog is not null
                            (
                                "Follow"."target_catalog_id" IS NOT NULL
                                AND "ActivityLog"."target_package_id" IN
                                (
                                    SELECT id
                                    FROM package
                                    WHERE catalog_id = "Follow"."target_catalog_id"
                                )
                            )
                            OR
                            -- Include collection's packages logs if collection is not null
                            (
                                "Follow"."target_collection_id" IS NOT NULL
                                AND "ActivityLog"."target_package_id" IN
                                (
                                    SELECT package_id
                                    FROM collection_package
                                    WHERE collection_id = "Follow"."target_collection_id"
                                )
                            )
                        )
                    )
                )

                -- Permission checks
                AND
                    CASE
                        WHEN "ActivityLog"."target_collection_id" IS NULL THEN TRUE
                        ELSE
                            (
                                (SELECT c.is_public FROM collection c WHERE c.id = "ActivityLog"."target_collection_id") IS TRUE
                                OR
                                (EXISTS (SELECT cu.collection_id FROM collection_user cu WHERE "ActivityLog"."target_collection_id" = cu.collection_id AND cu.user_id = "Follow".user_id))
                            )
                    END
                AND
                    CASE
                        WHEN "ActivityLog"."target_catalog_id" IS NULL THEN TRUE
                        ELSE
                            (
                                (SELECT c."isPublic" FROM catalog c WHERE c.id = "ActivityLog"."target_catalog_id") IS TRUE
                                OR
                                (EXISTS (SELECT cu.catalog_id FROM user_catalog cu WHERE "ActivityLog"."target_catalog_id" = cu.catalog_id AND cu.user_id = "Follow".user_id))
                            )
                    END
                AND
                    CASE
                        WHEN "ActivityLog"."target_package_issue_id" IS NULL THEN TRUE
                        ELSE (EXISTS (SELECT pi.id FROM package_issue pi WHERE "ActivityLog"."target_package_issue_id" = pi.id))
                    END
                AND
                    CASE
                        WHEN "ActivityLog"."target_package_id" IS NULL THEN TRUE
                        ELSE
                            (
                                -- Check whether the log is included in user's log level follow settings
                                CASE
                                    WHEN "ActivityLog"."event_type" != 'VERSION_CREATED'::activity_log_event_type_enum THEN TRUE
                                    ELSE ("ActivityLog"."change_type"::activity_log_change_type_enum IN (SELECT * FROM unnest("Follow"."change_type")))
                                END
                                AND
                                -- Permission check
                                (
                                    (SELECT pkg."isPublic" FROM package pkg WHERE pkg.id = "ActivityLog"."target_package_id") IS TRUE
                                    OR
                                    (EXISTS (SELECT pu.package_id FROM user_package_permission pu WHERE "ActivityLog"."target_package_id" = pu.package_id AND pu.user_id = "Follow".user_id))
                                )
                            )
                    END
                `
            )
            .setParameter("userId", userId)
            .orderBy('"ActivityLog"."created_at"', "DESC")
            .offset(offset)
            .limit(limit)
            .addRelations(alias, relations)
            .getManyAndCount();
    }
}
