import { UserInputError } from "apollo-server";
import { EntityRepository, Repository, SelectQueryBuilder } from "typeorm";
import { Collection } from "../entity/Collection";
import { User } from "../entity/User";
import { CreateCollectionInput, UpdateCollectionInput } from "../generated/graphql";
import { StorageErrors } from "../storage/files/file-storage-service";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { UserRepository } from "./UserRepository";

@EntityRepository(Collection)
export class CollectionRepository extends Repository<Collection> {
    private static readonly COLLECTION_RELATION_ALIAS = "Collection";

    public async createCollection(
        creator: User,
        collection: CreateCollectionInput,
        relations?: string[]
    ): Promise<Collection> {
        const entity = new Collection();
        entity.creatorId = creator.id;
        entity.name = collection.name;
        entity.collectionSlug = collection.collectionSlug;
        entity.description = collection.description;

        await this.save(entity);
        return this.findCollectionBySlugOrFail(collection.collectionSlug, relations);
    }

    public async updateCollection(
        collectionSlug: String,
        collection: UpdateCollectionInput,
        relations?: string[]
    ): Promise<Collection> {
        const collectionIdDb = await this.findCollectionBySlugOrFail(collectionSlug, relations);

        if (collection.newCollectionSlug) {
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
        user: User,
        limit: number,
        offSet: number,
        relations?: string[]
    ): Promise<[Collection[], number]> {
        return this.createQueryBuilder()
            .where("creator_id = :userId", { userId: user.id })
            .orderBy('"Collection"."updated_at"', "DESC")
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
        user?: User;
        username: string;
        offSet: number;
        limit: number;
        relations?: string[];
    }): Promise<[Collection[], number]> {
        const targetUser = await this.manager.getCustomRepository(UserRepository).findUserByUserName({ username });

        const response = await this.createQueryBuilderWithUserConditions(user?.id)
            .andWhere(
                `("Collection".id IN (SELECT collection_id FROM collection_user WHERE user_id = :targetUserId AND 'MANAGE' = ANY( permissions) ))`
            )
            .setParameter("targetUserId", targetUser.id)
            .offset(offSet)
            .limit(limit)
            .addRelations("Collection", relations)
            .getManyAndCount();

        return response;
    }

    public async deleteCollection(collectionSlug: string): Promise<void> {
        const collectionIdDb = await this.findCollectionBySlugOrFail(collectionSlug);
        await this.delete({ id: collectionIdDb.id });

        try {
            await ImageStorageService.INSTANCE.deleteCollectionCoverImage(collectionIdDb.id);
        } catch (error) {
            if (error.message == StorageErrors.FILE_DOES_NOT_EXIST) return;

            console.error(error.message);
        }
    }

    public async findCollectionBySlugOrFail(collectionSlug: String, relations?: string[]): Promise<Collection> {
        const collection = await this.createQueryBuilder()
            .where('"Collection"."slug" = :slug')
            .setParameter("slug", collectionSlug)
            .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations)
            .getOne();

        if (collection == null) {
            throw new UserInputError("COLLECTION_NOT_FOUND");
        }

        return collection;
    }

    public async findCollectionBySlug(collectionSlug: String, relations?: string[]): Promise<Collection | undefined> {
        return await this.createQueryBuilder()
            .where('"Collection"."slug" = :slug')
            .setParameter("slug", collectionSlug)
            .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations)
            .getOne();
    }

    public async findByUser(userId: number, relations?: string[]): Promise<Collection[]> {
        return this.createQueryBuilder()
            .where('"Collection"."creator_id" = :userId')
            .setParameter("userId", userId)
            .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations)
            .getMany();
    }

    public async findCollectionsForAuthenticatedUser(userId: number, relations?: string[]): Promise<Collection[]> {
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
        user: User;
        startsWith: string;
        relations?: string[];
    }): Promise<Collection[]> {
        const ALIAS = "autoCompleteCollection";

        const entities = await this.createQueryBuilderWithUserConditions(user.id)
            .andWhere(`(LOWER("Collection"."slug") LIKE :queryLike OR LOWER("Collection"."name") LIKE :queryLike)`, {
                startsWith,
                queryLike: startsWith.toLowerCase() + "%"
            })
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
    ): Promise<[Collection[], number]> {
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

    private createQueryBuilderWithUserConditions(userId?: number): SelectQueryBuilder<Collection> {
        const publicCollectionQueryBuilder = this.createQueryBuilder().where('("Collection"."is_public")');
        if (!userId) {
            return publicCollectionQueryBuilder;
        }

        return publicCollectionQueryBuilder
            .orWhere(
                `("Collection"."id" IN (SELECT collection_id FROM collection_user WHERE user_id = :userId AND 'VIEW' = any(permissions)))`
            )
            .setParameter("userId", userId);
    }
}
