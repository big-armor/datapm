import { UserInputError } from "apollo-server";
import { EntityRepository, Repository, SelectQueryBuilder } from "typeorm";
import { CollectionEntity } from "../entity/CollectionEntity";
import { UserEntity } from "../entity/UserEntity";
import { CreateCollectionInput, UpdateCollectionInput } from "../generated/graphql";
import { StorageErrors } from "../storage/files/file-storage-service";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { UserRepository } from "./UserRepository";
import { ReservedKeywordsService } from "../service/reserved-keywords-service";

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
        collectionSlug: String,
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

        if (collection.isPublic != null && collection.isPublic != undefined) {
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

        const response = await this.createQueryBuilderWithUserConditions(user?.id)
            .andWhere(
                `("CollectionEntity".id IN (SELECT collection_id FROM collection_user WHERE user_id = :targetUserId AND 'EDIT' = ANY( permissions) ))`
            )
            .setParameter("targetUserId", targetUser.id)
            .offset(offSet)
            .limit(limit)
            .addRelations("CollectionEntity", relations)
            .getManyAndCount();

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

    public async findCollectionBySlugOrFail(collectionSlug: String, relations?: string[]): Promise<CollectionEntity> {
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
        collectionSlug: String,
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
        return this.createQueryBuilderWithUserConditions(userId)
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

        const entities = await this.createQueryBuilderWithUserConditions(user?.id)
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
            this.createQueryBuilderWithUserConditions(userId)
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
        return this.createQueryBuilderWithUserConditions(userId)
            .andWhere('EXISTS (SELECT 1 FROM collection_package WHERE collection_id = "CollectionEntity"."id")')
            .orderBy('"CollectionEntity"."updated_at"', "DESC")
            .limit(limit)
            .offset(offSet)
            .addRelations(ALIAS, relations)
            .getManyAndCount();
    }

    private createQueryBuilderWithUserConditions(userId?: number): SelectQueryBuilder<CollectionEntity> {
        const queryBuilder = this.createQueryBuilder();

        if (!userId) {
            return queryBuilder.where('("CollectionEntity"."is_public")');
        }

        return queryBuilder
            .where(
                `(("CollectionEntity"."is_public") OR ("CollectionEntity"."id" IN (SELECT collection_id FROM collection_user WHERE user_id = :userId AND 'VIEW' = any(permissions))))`
            )
            .setParameter("userId", userId);
    }
}
