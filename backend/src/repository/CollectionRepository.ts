import { UserInputError } from "apollo-server";
import { EntityRepository, Repository, SelectQueryBuilder } from "typeorm";
import { Collection } from "../entity/Collection";
import { User } from "../entity/User";
import { CreateCollectionInput, UpdateCollectionInput } from "../generated/graphql";

@EntityRepository(Collection)
export class CollectionRepository extends Repository<Collection> {

  private static readonly COLLECTION_RELATION_ALIAS = "Collection";

  public async createCollection(creator: User, collection: CreateCollectionInput, relations?: string[]): Promise<Collection> {
    const entity = new Collection();
    entity.name = collection.name;
    entity.collectionSlug = collection.collectionSlug;
    entity.description = collection.description;
    entity.creatorId = creator.id;

    await this.save(entity);
    return this.findCollectionBySlugOrFail(collection.collectionSlug, relations);
  }

  public async updateCollection(collectionSlug: String, collection: UpdateCollectionInput, relations?: string[]): Promise<Collection> {
    const collectionIdDb = await this.findCollectionBySlugOrFail(collectionSlug, relations);

    if (collection.collectionSlug) {
      collectionIdDb.collectionSlug = collection.collectionSlug;
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

  public async disableCollection(collectionSlug: String, relations?: string[]): Promise<Collection> {
    const collectionIdDb = await this.findCollectionBySlugOrFail(collectionSlug, relations);
    collectionIdDb.isActive = false;
    return this.save(collectionIdDb);
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

  public async findCollectionsForAuthenticatedUser(userId: number, relations?: string[]): Promise<Collection[]> {
    return this.createQueryBuilderWithUserConditions(userId)
      .setParameter("userId", userId)
      .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations)
      .getMany();
  }

  public async search(userId: number, query: string, limit: number, offSet: number, relations?: string[]): Promise<[Collection[], number]> {
    return this
      .createQueryBuilderWithUserConditions(userId)
      .andWhere("(name_tokens @@ to_tsquery(:query) OR description_tokens @@ to_tsquery(:query))")
      .setParameter("query", query)
      .limit(limit)
      .offset(offSet)
      // .addRelations(CollectionRepository.COLLECTION_RELATION_ALIAS, relations) - Will fix this in another PR when I add collecition packages
      .getManyAndCount();
  }

  private createQueryBuilderWithUserConditions(userId: number): SelectQueryBuilder<Collection> {
    const publicCollectionQueryBuilder = this.createQueryBuilder().where('("Collection"."is_public" and "Collection"."is_active")');
    if (!userId) {
      return publicCollectionQueryBuilder;
    }

    return publicCollectionQueryBuilder
      .orWhere(`("Collection"."is_active" AND "Collection"."id" IN (SELECT collection_id FROM collection_user WHERE user_id = :userId AND 'VIEW' = any(permissions)))`)
      .setParameter("userId", userId);
  }
}