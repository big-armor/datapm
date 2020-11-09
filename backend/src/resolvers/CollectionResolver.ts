import { ApolloError, ValidationError } from "apollo-server";
import { AuthenticatedContext } from "../context";
import {
    CollectionIdentifierInput,
    CollectionPackage,
    CreateCollectionInput,
    PackageIdentifier,
    PackageIdentifierInput,
    UpdateCollectionInput
} from "../generated/graphql";
import { CollectionPackageRepository } from "../repository/CollectionPackageRepository";
import { CollectionRepository } from "../repository/CollectionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { getGraphQlRelationName } from "../util/relationNames";
import { grantAllCollectionPermissionsForUser } from "./UserCollectionPermissionResolver";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { ImageType } from "../storage/images/image-type";
import { Collection } from "../entity/Collection";

export const createCollection = async (
    _0: any,
    { value }: { value: CreateCollectionInput },
    context: AuthenticatedContext,
    info: any
) => {
    const val = { ...value, creatorId: context.me?.id };

    const repository = context.connection.manager.getCustomRepository(CollectionRepository);

    const existingCollection = await repository.findCollectionBySlug(val.collectionSlug);
    if (existingCollection) {
        throw new ValidationError("COLLECTION_SLUG_NOT_AVAILABLE");
    }

    const relations = getGraphQlRelationName(info);
    const createdCollection = await repository.createCollection(context.me, value, relations);
    await grantAllCollectionPermissionsForUser(context, createdCollection.id);
    return createdCollection;
};

export const updateCollection = async (
    _0: any,
    { identifier, value }: { identifier: CollectionIdentifierInput; value: UpdateCollectionInput },
    context: AuthenticatedContext,
    info: any
) => {
    const repository = context.connection.manager.getCustomRepository(CollectionRepository);

    if (value.newCollectionSlug && identifier.collectionSlug != value.newCollectionSlug) {
        const existingCollection = await repository.findCollectionBySlug(value.newCollectionSlug);
        if (existingCollection) {
            throw new ValidationError("COLLECTION_SLUG_NOT_AVAILABLE");
        }
    }

    const relations = getGraphQlRelationName(info);
    return repository.updateCollection(identifier.collectionSlug, value, relations);
};

export const myCollections = async (
    _0: any,
    { limit, offSet }: { limit: number; offSet: number },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .myCollections(context.me, limit, offSet, relations);

    return {
        hasMore: count - (offSet + limit) > 0,
        collections: searchResponse,
        count
    };
};

export const setCollectionCoverImage = async (
    _0: any,
    { identifier, image }: { identifier: CollectionIdentifierInput; image: any },
    context: AuthenticatedContext,
    info: any
) => {
    const uploadedImage = await image;
    const collectionEntity = await context.connection
        .getCustomRepository(CollectionRepository)
        .findCollectionBySlugOrFail(identifier.collectionSlug);
    await ImageStorageService.INSTANCE.saveImage(
        collectionEntity.id,
        uploadedImage,
        ImageType.COLLECTION_COVER_IMAGE,
        context
    );
};

export const disableCollection = async (
    _0: any,
    { identifier }: { identifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);
    return context.connection.manager
        .getCustomRepository(CollectionRepository)
        .disableCollection(identifier.collectionSlug, relations);
};

export const addPackageToCollection = async (
    _0: any,
    {
        collectionIdentifier,
        packageIdentifier
    }: { collectionIdentifier: CollectionIdentifierInput; packageIdentifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: any
): Promise<CollectionPackage> => {
    const repository = context.connection.manager.getCustomRepository(CollectionRepository);
    const collectionEntity = await repository.findCollectionBySlugOrFail(collectionIdentifier.collectionSlug);
    const identifier = packageIdentifier;
    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier, includeActiveOnly: true });

    await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .addPackageToCollection(context.me.id, collectionEntity.id, packageEntity.id);

    const relations = getGraphQlRelationName(info);

    const value = await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .findByCollectionIdAndPackageId(collectionEntity.id, packageEntity.id, relations);

    if (value == undefined)
        throw new ApolloError("Not able to find the CollectionPackage entry after entry. This should never happen!");

    return value;
};

export const removePackageFromCollection = async (
    _0: any,
    {
        collectionIdentifier,
        packageIdentifier
    }: { collectionIdentifier: CollectionIdentifierInput; packageIdentifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const repository = context.connection.manager.getCustomRepository(CollectionRepository);
    const collectionEntity = await repository.findCollectionBySlugOrFail(collectionIdentifier.collectionSlug);
    const identifier = packageIdentifier;
    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier, includeActiveOnly: true });

    await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .removePackageToCollection(collectionEntity.id, packageEntity.id);
};

export const findCollectionsForAuthenticatedUser = async (_0: any, {}, context: AuthenticatedContext, info: any) => {
    const relations = getGraphQlRelationName(info);
    return context.connection.manager
        .getCustomRepository(CollectionRepository)
        .findCollectionsForAuthenticatedUser(context.me.id, relations);
};

export const findCollectionBySlug = async (
    _0: any,
    { identifier }: { identifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);
    return context.connection.manager
        .getCustomRepository(CollectionRepository)
        .findCollectionBySlugOrFail(identifier.collectionSlug, relations);
};

export const searchCollections = async (
    _0: any,
    { query, limit, offset }: { query: string; limit: number; offset: number },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .search(context.me?.id, query, limit, offset, relations);

    return {
        hasMore: count - (offset + limit) > 0,
        collections: searchResponse,
        count
    };
};
