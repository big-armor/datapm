import { DeleteResult, EntityRepository, Repository, SelectQueryBuilder } from "typeorm";
import { ActivityLogEntity } from "../entity/ActivityLogEntity";
import { FollowEntity } from "../entity/FollowEntity";
import { UserEntity } from "../entity/UserEntity";
import { ActivityLogEventType, NotificationFrequency } from "../generated/graphql";
import { Notification, CatalogNotification } from "../util/notificationUtil";

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
               MIN(a.created_at) as created_at, 
               json_agg(a.user_id) as action_users, 
               json_agg(a.target_package_id) as package_ids, array_accum(distinct a.properties_edited) as properties_edited 
           from activity_log a 
           where
           a.created_at  > $2
           AND a.created_at <= $3 
           and a.target_catalog_id = f.target_catalog_id 
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
                action_users: number[];
                created_at: string;
                event_type: ActivityLogEventType;
                package_ids: number[];
                properties_edited: string[];
            }[];
        }[];

        return query.map((v) => {
            return {
                userId: v.user_id,
                catalogNotifications: [
                    {
                        catalogId: v.target_catalog_id,
                        actions: v.pending_notifications.map((n) => {
                            return {
                                event_type: n.event_type,
                                created_at: new Date(n.created_at),
                                action_users: n.action_users,
                                properties_edited: n.properties_edited,
                                package_ids: n.package_ids
                            };
                        })
                    }
                ]
            };
        });
    }
}
