import { UserInputError } from "apollo-server";
import { EntityRepository, Repository } from "typeorm";
import { Collection } from "../entity/Collection";
import { CreateCollectionInput, UpdateCollectionInput } from "../generated/graphql";

@EntityRepository(Collection)
export class CollectionRepository extends Repository<Collection> {

  public async createCollection(collection: CreateCollectionInput): Promise<Collection> {
    const entity = new Collection();
    entity.name = collection.name;
    entity.collectionSlug = collection.collectionSlug;
    entity.description = collection.description;
    return this.save(entity);
  }

  public async updateCollection(collectionSlug: String, collection: UpdateCollectionInput): Promise<Collection> {
    const collectionIdDb = await this.findCollectionBySlugOrFail(collectionSlug);

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

  public async disableCollection(collectionSlug: String): Promise<Collection> {
    const collectionIdDb = await this.findCollectionBySlugOrFail(collectionSlug);
    collectionIdDb.isActive = false;
    return this.save(collectionIdDb);
  }

  public async findCollectionBySlugOrFail(collectionSlug: String): Promise<Collection> {
    const collection = await this.createQueryBuilder()
      .where('"Collection"."slug" = :slug')
      .setParameter("slug", collectionSlug)
      .getOne();

    if (collection == null) {
      throw new UserInputError("COLLECTION_NOT_FOUND");
    }

    return collection;
  }

  public async findCollectionBySlug(collectionSlug: String): Promise<Collection | undefined> {
    return await this.createQueryBuilder()
      .where('"Collection"."slug" = :slug')
      .setParameter("slug", collectionSlug)
      .getOne();
  }

  public async findCollectionsForAuthenticatedUser(userId: number): Promise<Collection[]> {
    return this.createQueryBuilder()
      .where('("Collection"."is_public" and "Collection"."is_active")')
      .orWhere(`("Collection"."is_active" AND "Collection"."id" IN (SELECT collection_id FROM collection_user WHERE user_id = :userId AND 'VIEW' = any(permissions)))`)
      .setParameter("userId", userId)
      .getMany();
  }
}