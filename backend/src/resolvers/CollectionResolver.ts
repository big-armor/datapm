import { ApolloError, ValidationError, UserInputError } from "apollo-server";
import { AuthenticatedContext } from "../context";
import {
    Base64ImageUpload,
    CollectionIdentifierInput,
    CollectionPackage,
    CreateCollectionInput,
    PackageIdentifier,
    PackageIdentifierInput,
    UpdateCollectionInput,
    Permission
} from "../generated/graphql";
import { CollectionPackageRepository } from "../repository/CollectionPackageRepository";
import { CollectionRepository } from "../repository/CollectionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { VersionRepository } from "../repository/VersionRepository";

import { UserCollectionPermissionRepository } from "../repository/UserCollectionPermissionRepository";
import { getGraphQlRelationName } from "../util/relationNames";
import { grantAllCollectionPermissionsForUser } from "./UserCollectionPermissionResolver";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { Collection } from "../entity/Collection";
import { ActivityLog } from "../entity/ActivityLog";
import { ActivityLogEventType } from "../entity/ActivityLogEventType";
import { exit } from "process";

export const usersByCollection = async (
    _0: any,
    { identifier }: { identifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);

    const collectionEntity = await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .findCollectionBySlugOrFail(identifier.collectionSlug);

    return await context.connection.manager
        .getCustomRepository(UserCollectionPermissionRepository)
        .usersByCollection(collectionEntity, relations);
};

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

export const collectionPackages = async (
    _0: any,
    { identifier, limit, offset }: { identifier: CollectionIdentifierInput; limit: number; offset: number },
    context: AuthenticatedContext,
    info: any
) => {
    const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .getUserByUsername(context.me?.username);

    if (!user) throw new UserInputError(`USER_NOT_FOUND - ${context.me.username}`);

    const collectionEntity = await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .findCollectionBySlugOrFail(identifier.collectionSlug);

    if (!collectionEntity) throw new UserInputError("COLLECTION_NOT_FOUND");

    const relations = getGraphQlRelationName(info);

    return await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .collectionPackages(user.id, collectionEntity.id, limit, offset, relations);
};

export const setCollectionCoverImage = async (
    _0: any,
    { identifier, image }: { identifier: CollectionIdentifierInput; image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: any
) => {
    const collection = await context.connection
        .getCustomRepository(CollectionRepository)
        .findCollectionBySlugOrFail(identifier.collectionSlug);
    return ImageStorageService.INSTANCE.saveCollectionCoverImage(collection.id, image.base64);
};

export const deleteCollection = async (
    _0: any,
    { identifier }: { identifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);
    await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .deleteCollection(identifier.collectionSlug);
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
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier });

    const hasVersions = await context.connection.manager
        .getCustomRepository(VersionRepository)
        .findVersions({ packageId: packageEntity.id });

    if (!hasVersions.length) throw new UserInputError("PACKAGE_HAS_NO_VERSIONS");

    await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .addPackageToCollection(context.me.id, collectionEntity.id, packageEntity.id);

    const relations = getGraphQlRelationName(info);

    const value = await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .findByCollectionIdAndPackageId(collectionEntity.id, packageEntity.id, relations);

    if (value == undefined)
        throw new ApolloError("Not able to find the CollectionPackage entry after entry. This should never happen!");

    try {
        await context.connection.getRepository(ActivityLog).create({
            userId: context?.me?.id,
            eventType: ActivityLogEventType.CollectionPackageAdded,
            targetCollectionId: value?.collectionId
        });
    } catch (e) {}

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
        .findPackageOrFail({ identifier });

    await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .removePackageToCollection(collectionEntity.id, packageEntity.id);

    try {
        await context.connection.getRepository(ActivityLog).create({
            userId: context?.me?.id,
            eventType: ActivityLogEventType.CollectionPackageRemoved,
            targetCollectionId: collectionEntity?.id
        });
    } catch (e) {}
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

export const myPermissions = async (parent: any, _0: any, context: AuthenticatedContext) => {
    const collection = parent as Collection;

    if (context.me == null) {
        if (collection.isPublic) return [Permission.VIEW];

        console.error("Anonymous user request just resolved permissions for a non-public collection!!! THIS IS BAD!!!");
        exit(1); // Shut down the server so the admin knows something very bad happened
    }

    const userPermission = await context.connection
        .getCustomRepository(UserCollectionPermissionRepository)
        .findCollectionPermissions({
            collectionId: collection.id,
            userId: context.me.id
        });

    if (userPermission == null) {
        if (collection.isPublic) return [Permission.VIEW];
        console.error(
            "User " +
                context.me.username +
                " request just resolved permissions for a non-public collection to which they have no permissions!!! THIS IS BAD!!!"
        );
        exit(1); // Shut down the server so the admin knows something very bad happened
    }

    return userPermission.permissions;
};
