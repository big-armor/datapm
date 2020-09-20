import { AuthenticatedContext } from "../context";
import { CollectionIdentifierInput, CreateCollectionInput, UpdateCollectionInput } from "../generated/graphql";
import { CollectionRepository } from "../repository/CollectionRepository";
import { grantAllCollectionPermissionsForUser } from "./UserCollectionPermissionResolver";

export const createCollection = async (_0: any, { value }: { value: CreateCollectionInput }, context: AuthenticatedContext, info: any) => {
  const repository = context.connection.manager
    .getCustomRepository(CollectionRepository);

  const existingCollection = await repository.findCollectionBySlug(value.collectionSlug);
  if (existingCollection) {
    throw new Error("Collection slug is taken");
  }

  const createdCollection = await repository.createCollection(value);
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

  return repository.updateCollection(identifier.collectionSlug, value);
}

export const disableCollection = async (_0: any, { identifier }: { identifier: CollectionIdentifierInput }, context: AuthenticatedContext, info: any) => {
  return context.connection.manager
    .getCustomRepository(CollectionRepository)
    .disableCollection(identifier.collectionSlug);
}

export const findCollectionsForAuthenticatedUser = async (_0: any, { }, context: AuthenticatedContext, info: any) => {
  return context.connection.manager
    .getCustomRepository(CollectionRepository)
    .findCollectionsForAuthenticatedUser(context.me.id);
}

export const findCollectionBySlug = async (_0: any, { identifier }: { identifier: CollectionIdentifierInput }, context: AuthenticatedContext, info: any) => {
  return context.connection.manager
    .getCustomRepository(CollectionRepository)
    .findCollectionBySlugOrFail(identifier.collectionSlug);
}