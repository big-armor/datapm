import { AuthenticatedContext } from "../context";
import { CollectionIdentifierInput, CreateCollectionInput, UpdateCollectionInput } from "../generated/graphql";
import { CollectionRepository } from "../repository/CollectionRepository";
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