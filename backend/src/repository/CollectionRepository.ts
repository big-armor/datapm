import { UserInputError } from "apollo-server";
import { EntityRepository, Repository, SelectQueryBuilder } from "typeorm";
import { CollectionEntity } from "../entity/CollectionEntity";
import { UserEntity } from "../entity/UserEntity";
import { Collection, CreateCollectionInput, Permission, UpdateCollectionInput } from "../generated/graphql";
import { StorageErrors } from "../storage/files/file-storage-service";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { UserRepository } from "./UserRepository";
import { ReservedKeywordsService } from "../service/reserved-keywords-service";

const PUBLIC_COLLECTIONS_QUERY = '("CollectionEntity"."is_public" is true)';
const AUTHENTICATED_USER_COLLECTIONS_QUERY = `
    (
        ("CollectionEntity"."id" IN (SELECT collection_id FROM collection_user WHERE user_id = :userId AND :permission = any(permissions)))
        OR
        ("CollectionEntity"."id" IN (select gc.collection_id FROM group_collection_permissions gc WHERE :permission = ANY(gc.permissions) AND gc.group_id IN (select gu.group_id FROM group_user gu WHERE gu.user_id = :userId)))
    )`;
export const AUTHENTICATED_USER_OR_PUBLIC_COLLECTIONS_QUERY = `(${PUBLIC_COLLECTIONS_QUERY} or ${AUTHENTICATED_USER_COLLECTIONS_QUERY})`;

@EntityRepository(CollectionEntity)
export class CollectionRepository extends Repository<CollectionEntity> {
    private static readonly COLLECTION_RELATION_ALIAS = "CollectionEntity";

    public async createCollection(
        creator: UserEntity,
        collection: CreateCollectionInput,
        relations?: string[]
    ): Promise<CollectionEntity> {
        ReservedKeywordsService.validateReservedKeyword(collection.collectionSlug);
        const entity = new CollectionEntity();
        entity.creatorId = creator.id;
        entity.name = collection.name;
        entity.collectionSlug = collection.collectionSlug;
        entity.description = collection.description;
        entity.isPublic = collection.isPublic != null && collection.isPublic;

        await this.save(entity);
        return this.findCollectionBySlugOrFail(collection.collectionSlug, relations);
    }

    public async updateCollection(
        collectionSlug: string,
        collection: UpdateCollectionInput,
        relations?: string[]
    ): Promise<CollectionEntity> {
        const collectionIdDb = await this.findCollectionBySlugOrFail(collectionSlug, relations);

        if (collection.newCollectionSlug) {
            ReservedKeywordsService.validateReservedKeyword(collection.newCollectionSlug);
            collectionIdDb.collectionSlug = collection.newCollectionSlug;
        }

        if (collection.name) {
            collectionIdDb.name = collection.name;
        }

        if (collection.description) {
            collectionIdDb.description = collection.description;
        }

        if (collection.isPublic != null) {
            collectionIdDb.isPublic = collection.isPublic;
        }

        return this.save(collectionIdDb);
    }

    public async myCollections(
        user: UserEntity,
        limit: number,
        offSet: number,
        relations: string[] = []
    ): Promise<[CollectionEntity[], number]> {
        return this.createQueryBuilder("collection")
            .leftJoin("collection_user", "permission", "permission.collection_id = collection.id")
            .where("creator_id = :userId", { userId: user.id })
            .orWhere("permission.user_id = :userId", { userId: user.id })
            .orderBy('"collection"."updated_at"', "DESC")
            .limit(limit)
            .offset(offSet)
            .getManyAndCount();
    }

    async userCollections({
        user,
        username,
        offSet,
        limit,
        relations = []
    }: {
        user?: UserEntity;
        username: string;
        offSet: number;
        limit: number;
        relations?: string[];
    }): Promise<[CollectionEntity[], number]> {
        const targetUser = await this.manager.getCustomRepository(UserRepository).findUserByUserName({ username });

        if (targetUser == null) {
            throw new UserInputError("USER_NOT_FOUND " + username);
        }

        const query = this.createQueryBuilderWithUserConditions(user?.id, Permission.VIEW)
            .andWhere(`("CollectionEntity"."creator_id" = :targetUserId)`)
            .setParameter("targetUserId", targetUser.id)
            .offset(offSet)
            .limit(limit)
            .addRelations("CollectionEntity", relations);

        const queryString = query.getQuery();

        const response = await query.getManyAndCount();

        return response;
    }

    public async deleteCollection(collectionSlug: string): Promise<void> {
        const collectionIdDb = await this.findCollectionBySlugOrFail(collectionSlug);
        await this.delete({ id: collectionIdDb.id });

        try {
            await ImageStorageService.INSTANCE.deleteCollectionCoverImage(collectionIdDb.id);
        } catch (error) {
            if (!error.message.includes(StorageErrors.FILE_DOES_NOT_EXIST)) {
                console.error(error.message);
            }
        }
    }

    public async findCollectionBySlugOrFail(collectionSlug: string, relations?: string[]): Promise<CollectionEntity> {
        const collection = await this.createQueryBuilder()
            .where('"CollectionEntity"."slug" = :slug')
            .setParameter("slug", collectionSlug)
            .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations)
            .getOne();

        if (collection == null) {
            throw new UserInputError("COLLECTION_NOT_FOUND");
        }

        return collection;
    }

    public async findCollectionBySlug(
        collectionSlug: string,
        relations?: string[]
    ): Promise<CollectionEntity | undefined> {
        return await this.createQueryBuilder()
            .where('"CollectionEntity"."slug" = :slug')
            .setParameter("slug", collectionSlug)
            .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations)
            .getOne();
    }

    public async findByUser(userId: number, relations?: string[]): Promise<CollectionEntity[]> {
        return this.createQueryBuilder()
            .where('"CollectionEntity"."creator_id" = :userId')
            .setParameter("userId", userId)
            .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations)
            .getMany();
    }

    public async findCollectionsForAuthenticatedUser(
        userId: number,
        relations?: string[]
    ): Promise<CollectionEntity[]> {
        return this.createQueryBuilderWithUserConditions(userId, Permission.VIEW)
            .setParameter("userId", userId)
            .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations)
            .getMany();
    }

    async autocomplete({
        user,
        startsWith,
        relations = []
    }: {
        user: UserEntity | undefined;
        startsWith: string;
        relations?: string[];
    }): Promise<CollectionEntity[]> {
        const ALIAS = "autoCompleteCollection";

        const entities = await this.createQueryBuilderWithUserConditions(user?.id, Permission.VIEW)
            .andWhere(
                `(LOWER("CollectionEntity"."slug") LIKE :queryLike OR LOWER("CollectionEntity"."name") LIKE :queryLike)`,
                {
                    startsWith,
                    queryLike: startsWith.toLowerCase() + "%"
                }
            )
            .addRelations(ALIAS, relations)
            .getMany();

        return entities;
    }

    public async search(
        userId: number,
        query: string,
        limit: number,
        offSet: number,
        relations?: string[]
    ): Promise<[CollectionEntity[], number]> {
        return (
            this.createQueryBuilderWithUserConditions(userId, Permission.VIEW)
                .andWhere(
                    "(name_tokens @@ websearch_to_tsquery(:query) OR description_tokens @@ websearch_to_tsquery(:query))"
                )
                .setParameter("query", query)
                .limit(limit)
                .offset(offSet)
                // .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations) - Will fix this in another PR when I add collecition packages
                .getManyAndCount()
        );
    }

    async getLatestCollections(
        userId: number,
        limit: number,
        offSet: number,
        relations?: string[]
    ): Promise<[CollectionEntity[], number]> {
        const ALIAS = "latestCollections";
        return this.createQueryBuilderWithUserConditions(userId, Permission.VIEW)
            .andWhere('EXISTS (SELECT 1 FROM collection_package WHERE collection_id = "CollectionEntity"."id")')
            .orderBy('"CollectionEntity"."updated_at"', "DESC")
            .limit(limit)
            .offset(offSet)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }

    private createQueryBuilderWithUserConditions(
        userId: number | undefined,
        permission: Permission
    ): SelectQueryBuilder<CollectionEntity> {
        const queryBuilder = this.createQueryBuilder();

        if (!userId) {
            return queryBuilder.where('("CollectionEntity"."is_public" is true)');
        }

        return queryBuilder
            .where(AUTHENTICATED_USER_OR_PUBLIC_COLLECTIONS_QUERY)
            .setParameter("userId", userId)
            .setParameter("permission", permission);
    }

    async getPublicCollections(limit: number, offSet: number, relations?: string[]): Promise<CollectionEntity[]> {
        const ALIAS = "CollectionEntity";
        return (
            this.createQueryBuilder(ALIAS)
                // .orderBy('"PublishCollections"."created_at"', "DESC") // TODO Sort by views (or popularity)
                .where(PUBLIC_COLLECTIONS_QUERY)
                .limit(limit)
                .offset(offSet)
                .addRelations(ALIAS, relations)
                .getMany()
        );
    }

    async countPublicCollections(): Promise<number> {
        const ALIAS = "CountCollections";
        return this.createQueryBuilder(ALIAS).where(`("CountCollections"."is_public" = true)`).getCount();
    }
}
