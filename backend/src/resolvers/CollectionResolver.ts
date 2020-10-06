import { ApolloError } from "apollo-server";
import { AuthenticatedContext } from "../context";
import { CollectionIdentifierInput, CollectionPackage, CreateCollectionInput, PackageIdentifier, PackageIdentifierInput, UpdateCollectionInput } from "../generated/graphql";
import { CollectionPackageRepository } from "../repository/CollectionPackageRepository";
import { CollectionRepository } from "../repository/CollectionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { getGraphQlRelationName } from "../util/relationNames";
import { grantAllCollectionPermissionsForUser } from "./UserCollectionPermissionResolver";

export const createCollection = async (_0: any, { value }: { value: CreateCollectionInput }, context: AuthenticatedContext, info: any) => {
  const repository = context.connection.manager
    .getCustomRepository(CollectionRepository);

  const existingCollection = await repository.findCollectionBySlug(value.collectionSlug);
  if (existingCollection) {
    throw new Error("Collection slug is taken");
  }

  const relations = getGraphQlRelationName(info);
  const createdCollection = await repository.createCollection(value, relations);
  await grantAllCollectionPermissionsForUser(context, createdCollection.id);
  return createdCollection;
}

export const updateCollection = async (_0: any, { identifier, value }: { identifier: CollectionIdentifierInput, value: UpdateCollectionInput }, context: AuthenticatedContext, info: any) => {
  const repository = context.connection.manager
    .getCustomRepository(CollectionRepository);

  if (value.collectionSlug && identifier.collectionSlug != value.collectionSlug) {
    const existingCollection = await repository.findCollectionBySlug(value.collectionSlug);
    if (existingCollection) {
      throw new Error("Collection slug is taken");
    }
  }

  const relations = getGraphQlRelationName(info);
  return repository.updateCollection(identifier.collectionSlug, value, relations);
}

export const disableCollection = async (_0: any, { identifier }: { identifier: CollectionIdentifierInput }, context: AuthenticatedContext, info: any) => {
  const relations = getGraphQlRelationName(info);
  return context.connection.manager
    .getCustomRepository(CollectionRepository)
    .disableCollection(identifier.collectionSlug, relations);
}

export const addPackageToCollection = async (_0: any, { collectionIdentifier, packageIdentifier }: { collectionIdentifier: CollectionIdentifierInput, packageIdentifier: PackageIdentifierInput }, context: AuthenticatedContext, info: any):Promise<CollectionPackage> => {
  const repository = context.connection.manager
    .getCustomRepository(CollectionRepository);
  const collectionEntity = await repository.findCollectionBySlugOrFail(collectionIdentifier.collectionSlug);
  const identifier = packageIdentifier;
  const packageEntity = await context.connection.getCustomRepository(PackageRepository).findPackageOrFail({ identifier });

  await context.connection.manager
    .getCustomRepository(CollectionPackageRepository)
    .addPackageToCollection(context.me.id, collectionEntity.id, packageEntity.id);
  
  const relations = getGraphQlRelationName(info);

  const value = await context.connection.manager
    .getCustomRepository(CollectionPackageRepository)
    .findByCollectionIdPackageId(collectionEntity.id, packageEntity.id, relations);


  if(value == undefined) 
    throw new ApolloError("Not able to find the CollectionPackage entry after entry. This should never happen!")

  return value;
}

export const removePackageFromCollection = async (_0: any, { collectionIdentifier, packageIdentifier }: { collectionIdentifier: CollectionIdentifierInput, packageIdentifier: PackageIdentifierInput }, context: AuthenticatedContext, info: any) => {
  const repository = context.connection.manager
    .getCustomRepository(CollectionRepository);
  const collectionEntity = await repository.findCollectionBySlugOrFail(collectionIdentifier.collectionSlug);
  const identifier = packageIdentifier;
  const packageEntity = await context.connection.getCustomRepository(PackageRepository).findPackageOrFail({ identifier });

  await context.connection.manager
    .getCustomRepository(CollectionPackageRepository)
    .removePackageToCollection(collectionEntity.id, packageEntity.id);
}

export const findCollectionsForAuthenticatedUser = async (_0: any, { }, context: AuthenticatedContext, info: any) => {
  const relations = getGraphQlRelationName(info);
  return context.connection.manager
    .getCustomRepository(CollectionRepository)
    .findCollectionsForAuthenticatedUser(context.me.id, relations);
}

export const findCollectionBySlug = async (_0: any, { identifier }: { identifier: CollectionIdentifierInput }, context: AuthenticatedContext, info: any) => {
  const relations = getGraphQlRelationName(info);
  return context.connection.manager
    .getCustomRepository(CollectionRepository)
    .findCollectionBySlugOrFail(identifier.collectionSlug, relations);
}

export const searchCollections = async (_0: any, { query, limit, offset }: { query: string, limit: number, offset: number }, context: AuthenticatedContext, info: any) => {
  const relations = getGraphQlRelationName(info);
  const [searchResponse, count] = await context
    .connection
    .manager
    .getCustomRepository(CollectionRepository)
    .search(context.me.id, query, limit, offset, relations);

  return {
    hasMore: count - (offset + limit) > 0,
    collections: searchResponse,
    count
  }
}