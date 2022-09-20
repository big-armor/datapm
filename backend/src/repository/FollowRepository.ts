/* eslint-disable camelcase */
import { DeleteResult, EntityRepository, Repository, SelectQueryBuilder } from "typeorm";
import { FollowEntity } from "../entity/FollowEntity";
import { ActivityLogChangeType, ActivityLogEventType, NotificationFrequency, User } from "../generated/graphql";
import { Notification } from "../util/notificationUtil";
import { UserRepository } from "./UserRepository";

@EntityRepository(FollowEntity)
export class FollowRepository extends Repository<FollowEntity> {
    public getCatalogFollows(
        userId: number,
        offset: number,
        limit: number,
        relations: string[] = []
    ): Promise<[FollowEntity[], number]> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_catalog_id" is not null')
            .setParameter("userId", userId)
            .offset(offset)
            .limit(limit)
            .addRelations("FollowEntity", relations)
            .getManyAndCount();
    }

    public getCollectionFollows(
        userId: number,
        offset: number,
        limit: number,
        relations: string[] = []
    ): Promise<[FollowEntity[], number]> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_collection_id" is not null')
            .setParameter("userId", userId)
            .offset(offset)
            .limit(limit)
            .addRelations("FollowEntity", relations)
            .getManyAndCount();
    }

    public getPackageFollows(
        userId: number,
        offset: number,
        limit: number,
        relations: string[] = []
    ): Promise<[FollowEntity[], number]> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_package_id" is not null')
            .setParameter("userId", userId)
            .offset(offset)
            .limit(limit)
            .addRelations("FollowEntity", relations)
            .getManyAndCount();
    }

    public getFollowsByPackageId(packageId: number, relations: string[] = []): Promise<FollowEntity[]> {
        return this.createQueryBuilder("FollowEntity")
            .where('"target_package_id" = :packageId')
            .setParameter("packageId", packageId)
            .addRelations("FollowEntity", relations)
            .getMany();
    }

    public getFollowsByPackageIssuesIds(packageIssueIds: number[], relations: string[] = []): Promise<FollowEntity[]> {
        return this.createQueryBuilder("FollowEntity")
            .where('"target_package_issue_id" IN (:...packageIssueIds)')
            .setParameter("packageIssueIds", packageIssueIds)
            .addRelations("FollowEntity", relations)
            .getMany();
    }

    public getFollowsByCatalogId(catalogId: number, relations: string[] = []): Promise<FollowEntity[]> {
        return this.createQueryBuilder("FollowEntity")
            .where('"target_catalog_id" = :catalogId')
            .setParameter("catalogId", catalogId)
            .addRelations("FollowEntity", relations)
            .getMany();
    }

    public getFollowsByCollectionId(collectionId: number, relations: string[] = []): Promise<FollowEntity[]> {
        return this.createQueryBuilder("FollowEntity")
            .where('"target_collection_id" = :collectionId')
            .setParameter("collectionId", collectionId)
            .addRelations("FollowEntity", relations)
            .getMany();
    }

    public getPackageIssueFollows(
        userId: number,
        offset: number,
        limit: number,
        relations: string[] = []
    ): Promise<[FollowEntity[], number]> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_package_issue_id" is not null')
            .setParameter("userId", userId)
            .offset(offset)
            .limit(limit)
            .addRelations("FollowEntity", relations)
            .getManyAndCount();
    }

    public getUserFollows(
        userId: number,
        offset: number,
        limit: number,
        relations: string[] = []
    ): Promise<[FollowEntity[], number]> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_user_id" is not null')
            .setParameter("userId", userId)
            .offset(offset)
            .limit(limit)
            .addRelations("FollowEntity", relations)
            .getManyAndCount();
    }

    public getFollowersByPackageId(packageId: number, offset: number, limit: number): Promise<[User[], number]> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_package_id" = :packageId')
            .setParameter("packageId", packageId)
            .offset(offset)
            .limit(limit)
            .orderBy('"FollowEntity"."created_at"', "ASC")
            .getManyAndCount();
    }

    public getFollowersByPackageIssueId(
        packageIssueId: number,
        offset: number,
        limit: number
    ): Promise<[User[], number]> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_package_issue_id" = :packageIssueId')
            .setParameter("packageIssueId", packageIssueId)
            .offset(offset)
            .limit(limit)
            .orderBy('"FollowEntity"."created_at"', "ASC")
            .getManyAndCount();
    }

    public getFollowersByCatalogId(catalogId: number, offset: number, limit: number): Promise<[User[], number]> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_catalog_id" = :catalogId')
            .setParameter("catalogId", catalogId)
            .offset(offset)
            .limit(limit)
            .orderBy('"FollowEntity"."created_at"', "ASC")
            .getManyAndCount();
    }

    public getFollowersByCollectionId(collectionId: number, offset: number, limit: number): Promise<[User[], number]> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_collection_id" = :collectionId')
            .setParameter("collectionId", collectionId)
            .offset(offset)
            .limit(limit)
            .orderBy('"FollowEntity"."created_at"', "ASC")
            .getManyAndCount();
    }

    public getFollowersByUserId(userId: number, offset: number, limit: number): Promise<[User[], number]> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_user_id" = :userId')
            .setParameter("userId", userId)
            .offset(offset)
            .limit(limit)
            .orderBy('"FollowEntity"."created_at"', "ASC")
            .getManyAndCount();
    }

    public getFollowersByPackageIdCount(packageId: number): Promise<number> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_package_id" = :packageId')
            .setParameter("packageId", packageId)
            .getCount();
    }

    public getFollowersByPackageIssueIdCount(packageIssueId: number): Promise<number> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_package_issue_id" = :packageIssueId')
            .setParameter("packageIssueId", packageIssueId)
            .getCount();
    }

    public getFollowersByCatalogIdCount(catalogId: number): Promise<number> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_catalog_id" = :catalogId')
            .setParameter("catalogId", catalogId)
            .getCount();
    }

    public getFollowersByCollectionIdCount(collectionId: number): Promise<number> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_collection_id" = :collectionId')
            .setParameter("collectionId", collectionId)
            .getCount();
    }

    public getFollowersByUserIdCount(userId: number): Promise<number> {
        return this.manager
            .getCustomRepository(UserRepository)
            .createQueryBuilder("UserEntity")
            .addSelect('"FollowEntity"."created_at"')
            .distinct(true)
            .innerJoin(
                (sb) => sb.select("f.*").from(FollowEntity, "f"),
                "FollowEntity",
                '"FollowEntity"."user_id" = "UserEntity"."id"'
            )
            .where('"FollowEntity"."target_user_id" = :userId')
            .setParameter("userId", userId)
            .getCount();
    }

    public getFollowByCatalogId(
        userId: number,
        catalogId: number,
        relations: string[] = []
    ): Promise<FollowEntity | undefined> {
        return this.getFollowByCatalogIdQuery(userId, catalogId).addRelations("FollowEntity", relations).getOne();
    }

    public getFollowByCollectionId(
        userId: number,
        collectionId: number,
        relations: string[] = []
    ): Promise<FollowEntity | undefined> {
        return this.getFollowByCollectionIdQuery(userId, collectionId).addRelations("FollowEntity", relations).getOne();
    }

    public getFollowByPackageId(
        userId: number,
        packageId: number,
        relations: string[] = []
    ): Promise<FollowEntity | undefined> {
        return this.getFollowByPackageIdQuery(userId, packageId).addRelations("FollowEntity", relations).getOne();
    }

    public getFollowByPackageIssueId(
        userId: number,
        packageIssueId: number,
        relations: string[] = []
    ): Promise<FollowEntity | undefined> {
        return this.getFollowByPackageIssueIdQuery(userId, packageIssueId)
            .addRelations("FollowEntity", relations)
            .getOne();
    }

    public getFollowByUserId(
        userId: number,
        targetUserId: number,
        relations: string[] = []
    ): Promise<FollowEntity | undefined> {
        return this.getFollowByUserIdQuery(userId, targetUserId).addRelations("FollowEntity", relations).getOne();
    }

    public deleteFollowByCatalogId(userId: number, catalogId: number): Promise<DeleteResult> {
        return this.getFollowByCatalogIdQuery(userId, catalogId).delete().from(FollowEntity).execute();
    }

    public deleteFollowByCollectionId(userId: number, collectionId: number): Promise<DeleteResult> {
        return this.getFollowByCollectionIdQuery(userId, collectionId).delete().from(FollowEntity).execute();
    }

    public deleteFollowByPackageId(userId: number, packageId: number): Promise<DeleteResult> {
        return this.getFollowByPackageIdQuery(userId, packageId).delete().from(FollowEntity).execute();
    }

    public deleteFollowByPackageIssueId(userId: number, packageIssueId: number): Promise<DeleteResult> {
        return this.getFollowByPackageIssueIdQuery(userId, packageIssueId).delete().from(FollowEntity).execute();
    }

    public deleteFollowsByPackageIssueIds(userId: number, packageIssueIds: number[]): Promise<DeleteResult> {
        if (packageIssueIds == null || packageIssueIds.length === 0) {
            return Promise.resolve({ raw: null, affected: 0 });
        }

        return this.getFollowsByPackageIssuesIdsQuery(userId, packageIssueIds).delete().from(FollowEntity).execute();
    }

    public deleteFollowByUserId(userId: number, targetUserId: number): Promise<DeleteResult> {
        return this.getFollowByUserIdQuery(userId, targetUserId).delete().from(FollowEntity).execute();
    }

    public deleteAllFollowsByUserId(userId: number): Promise<DeleteResult> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .setParameter("userId", userId)
            .delete()
            .from(FollowEntity)
            .execute();
    }

    private getFollowByCatalogIdQuery(userId: number, catalogId: number): SelectQueryBuilder<FollowEntity | undefined> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_catalog_id" = :catalogId')
            .setParameter("userId", userId)
            .setParameter("catalogId", catalogId);
    }

    private getFollowByCollectionIdQuery(
        userId: number,
        collectionId: number
    ): SelectQueryBuilder<FollowEntity | undefined> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_collection_id" = :collectionId')
            .setParameter("userId", userId)
            .setParameter("collectionId", collectionId);
    }

    private getFollowByPackageIdQuery(userId: number, packageId: number): SelectQueryBuilder<FollowEntity | undefined> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_package_id" = :packageId')
            .setParameter("userId", userId)
            .setParameter("packageId", packageId);
    }

    private getFollowByPackageIssueIdQuery(
        userId: number,
        packageIssueId: number
    ): SelectQueryBuilder<FollowEntity | undefined> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_package_issue_id" = :packageIssueId')
            .setParameter("userId", userId)
            .setParameter("packageIssueId", packageIssueId);
    }

    private getFollowsByPackageIssuesIdsQuery(
        userId: number,
        packageIssueIds: number[]
    ): SelectQueryBuilder<FollowEntity | undefined> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_package_issue_id" in (:...packageIssueId)')
            .setParameter("userId", userId)
            .setParameter("packageIssueId", packageIssueIds);
    }

    private getFollowByUserIdQuery(userId: number, targetUserId: number): SelectQueryBuilder<FollowEntity | undefined> {
        return this.createQueryBuilder("FollowEntity")
            .where('"user_id" = :userId')
            .andWhere('"target_user_id" = :targetUserId')
            .setParameter("userId", userId)
            .setParameter("targetUserId", targetUserId);
    }

    public async getCatalogFollowsForNotifications(
        startDate: Date,
        endDate: Date,
        frequency: NotificationFrequency
    ): Promise<Notification[]> {
        const sql = `select f.user_id, f.target_catalog_id, json_agg(al) as pending_notifications, COUNT(al) as count from follow f 
        join lateral(
           select a.event_type, 
           	   json_agg(json_build_object('created_at', a.created_at, 'user_id', a.user_id , 'package_id', a.target_package_id, 'properties_edited', a.properties_edited, 'change_type', a.change_type ) order by a.created_at ) as actions,
               array_accum(distinct a.properties_edited) as properties_edited 
           from activity_log a 
           where
           a.created_at  > $2
           AND a.created_at <= $3 
           and a.target_catalog_id  = f.target_catalog_id 
           and a.event_type in (select * from unnest( f.event_types)) 
           and a.user_id <> f.user_id 
           group by a.event_type
       ) al on true
       and f.notification_frequency = $1
       group by f.user_id, f.target_catalog_id 
       order by f.user_id`;

        const query = (await this.query(sql, [frequency, startDate, endDate])) as {
            user_id: number;
            target_catalog_id: number;
            pending_notifications: {
                actions: {
                    user_id: number;
                    created_at: string[];
                    package_id: number | null;
                    properties_edited: string[] | null;
                    change_type: ActivityLogChangeType;
                }[];
                event_type: ActivityLogEventType;
                properties_edited: string[];
            }[];
        }[];

        return query.map((v) => {
            return {
                userId: v.user_id,
                catalogNotifications: [
                    {
                        catalogId: v.target_catalog_id,
                        pending_notifications: v.pending_notifications
                    }
                ]
            };
        });
    }

    public async getPackageFollowsForNotifications(
        startDate: Date,
        endDate: Date,
        frequency: NotificationFrequency
    ): Promise<Notification[]> {
        const sql = `select f.user_id, al.target_package_id, json_agg(al) as pending_notifications, COUNT(al) as count from follow f
        join lateral(
           select a.event_type,
               a.target_package_id,
           	   json_agg(json_build_object('created_at', a.created_at, 'user_id', a.user_id, 'package_version_id', a.target_package_version_id, 'properties_edited', a.properties_edited, 'change_type', a.change_type ) order by a.created_at ) as actions,
               array_accum(distinct a.properties_edited) as properties_edited 
           from activity_log a where
           a.created_at  > $2
           AND a.created_at <= $3 
           AND (
            a.event_type in (select * from unnest(f.event_types))
            AND a.user_id <> f.user_id
            AND (
                a.target_package_id = f.target_package_id
                OR
                    (
                        f.follow_all_packages IS TRUE
                        AND
                        (
                            a."change_type"::activity_log_change_type_enum IN (SELECT * FROM unnest(f."change_type"))
                            AND
                            (
                                -- Include catalog's packages logs if catalog is not null
                                (
                                    f."target_catalog_id" IS NOT NULL
                                    AND a."target_package_id" IN
                                    (
                                        SELECT id
                                        FROM package
                                        WHERE catalog_id = f."target_catalog_id"
                                    )
                                )
                                OR
                                -- Include collection's packages logs if collection is not null
                                (
                                    f."target_collection_id" IS NOT NULL
                                    AND a."target_package_id" IN
                                    (
                                        SELECT package_id
                                        FROM collection_package
                                        WHERE collection_id = f."target_collection_id"
                                    )
                                )
                            )
                        )
                    )
                )
            )
            group by a.event_type, a.target_package_id
        ) al on true
       and f.notification_frequency = $1
       group by f.user_id, al.target_package_id 
       order by f.user_id`;

        const queryResult = await this.query(sql, [frequency, startDate, endDate]);
        const query = queryResult as {
            user_id: number;
            target_package_id: number;
            pending_notifications: {
                actions: {
                    user_id: number;
                    created_at: string[];
                    package_version_id: number | null;
                    properties_edited: string[] | null;
                    change_type: ActivityLogChangeType;
                }[];
                event_type: ActivityLogEventType;
                properties_edited: string[];
            }[];
        }[];

        return query.map((v) => {
            return {
                userId: v.user_id,
                packageNotifications: [
                    {
                        packageId: v.target_package_id,
                        pending_notifications: v.pending_notifications
                    }
                ]
            };
        });
    }

    public async getCollectionFollowsForNotifications(
        startDate: Date,
        endDate: Date,
        frequency: NotificationFrequency
    ): Promise<Notification[]> {
        const sql = `select f.user_id, f.target_collection_id, json_agg(al) as pending_notifications, COUNT(al) as count from follow f 
    join lateral(
       select a.event_type, 
              json_agg(json_build_object('created_at', a.created_at, 'user_id', a.user_id , 'package_id', a.target_package_id, 'properties_edited', a.properties_edited, 'change_type', a.change_type ) order by a.created_at ) as actions,
           array_accum(distinct a.properties_edited) as properties_edited 
       from activity_log a 
       where
       a.created_at  > $2
       AND a.created_at <= $3 
       and a.target_collection_id  = f.target_collection_id 
       and a.event_type in (select * from unnest( f.event_types)) 
       and a.user_id <> f.user_id 
       group by a.event_type
   ) al on true
   and f.notification_frequency = $1
   group by f.user_id, f.target_collection_id 
   order by f.user_id`;

        const query = (await this.query(sql, [frequency, startDate, endDate])) as {
            user_id: number;
            target_collection_id: number;
            pending_notifications: {
                actions: {
                    user_id: number;
                    created_at: string[];
                    package_id: number | null;
                    properties_edited: string[] | null;
                    change_type: ActivityLogChangeType;
                }[];
                event_type: ActivityLogEventType;
                properties_edited: string[];
            }[];
        }[];

        return query.map((v) => {
            return {
                userId: v.user_id,
                collectionNotifications: [
                    {
                        collectionId: v.target_collection_id,
                        pending_notifications: v.pending_notifications
                    }
                ]
            };
        });
    }

    public async getUserFollowsForNotifications(
        startDate: Date,
        endDate: Date,
        frequency: NotificationFrequency
    ): Promise<Notification[]> {
        const sql = `select f.user_id, f.target_user_id, json_agg(al) as pending_notifications, COUNT(al) as count from follow f 
    join lateral(
       select a.event_type, 
              json_agg(json_build_object('created_at', a.created_at, 'user_id', a.user_id , 'package_id', a.target_package_id, 'package_version_id', a.target_package_version_id, 'properties_edited', a.properties_edited, 'change_type', a.change_type ) order by a.created_at ) as actions,
           array_accum(distinct a.properties_edited) as properties_edited 
       from activity_log a 
       where
       a.created_at  > $2
       AND a.created_at <= $3 
       and a.user_id  = f.target_user_id 
       and a.event_type in (select * from unnest( f.event_types)) 
       and a.user_id <> f.user_id 
       group by a.event_type
   ) al on true
   and f.notification_frequency = $1
   group by f.user_id, f.target_user_id 
   order by f.user_id`;

        const query = (await this.query(sql, [frequency, startDate, endDate])) as {
            user_id: number;
            target_user_id: number;
            pending_notifications: {
                actions: {
                    user_id: number;
                    created_at: string[];
                    package_id: number | null;
                    package_version_id: number | null;
                    properties_edited: string[] | null;
                    change_type: ActivityLogChangeType;
                }[];
                event_type: ActivityLogEventType;
                properties_edited: string[];
            }[];
        }[];

        return query.map((v) => {
            return {
                userId: v.user_id,
                userNotifications: [
                    {
                        userId: v.target_user_id,
                        pending_notifications: v.pending_notifications
                    }
                ]
            };
        });
    }
}
