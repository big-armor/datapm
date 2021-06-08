import { DeleteResult, EntityRepository, Repository, SelectQueryBuilder } from "typeorm";
import { FollowEntity } from "../entity/FollowEntity";

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
}
