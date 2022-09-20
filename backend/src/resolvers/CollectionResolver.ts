import { ApolloError, ValidationError, UserInputError } from "apollo-server";
import { AuthenticatedContext, Context } from "../context";
import {
    Base64ImageUpload,
    CollectionIdentifierInput,
    CollectionPackage,
    CreateCollectionInput,
    PackageIdentifierInput,
    UpdateCollectionInput,
    Permission,
    Collection,
    ActivityLogEventType,
    ActivityLogChangeType,
    ActivityLogResult
} from "../generated/graphql";
import { CollectionPackageRepository } from "../repository/CollectionPackageRepository";
import { CollectionRepository } from "../repository/CollectionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { VersionRepository } from "../repository/VersionRepository";

import {
    getAllCollectionPermissions,
    UserCollectionPermissionRepository
} from "../repository/UserCollectionPermissionRepository";
import { getGraphQlRelationName } from "../util/relationNames";
import { grantAllCollectionPermissionsForUser, hasCollectionPermissions } from "./UserCollectionPermissionResolver";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { CollectionEntity } from "../entity/CollectionEntity";
import { ActivityLogRepository, createActivityLog } from "../repository/ActivityLogRepository";
import { getEnvVariable } from "../util/getEnvVariable";
import { packageEntityToGraphqlObject } from "./PackageResolver";
import { ReservedKeywordsService } from "../service/reserved-keywords-service";
import { activtyLogEntityToGraphQL } from "./ActivityLogResolver";
import { getUserFromCacheOrDbByIdOrFail, getUserFromCacheOrDbByUsernameOrFail } from "./UserResolver";
import { Connection, DeleteResult, EntityManager } from "typeorm";
import { deleteFollowsByIds, getCollectionFollowsByCollectionId } from "./FollowResolver";
import { isAuthenticatedContext } from "../util/contextHelpers";
import { UserCollectionPermissionEntity } from "../entity/UserCollectionPermissionEntity";
import { CollectionIdentifier, Package, User, UserCollectionPermissions } from "datapm-client-lib";
import { GraphQLResolveInfo } from "graphql";

export const collectionEntityToGraphQLOrNull = (collectionEntity: CollectionEntity): Collection | null => {
    if (!collectionEntity) {
        return null;
    }

    return collectionEntityToGraphQL(collectionEntity);
};

export const collectionEntityToGraphQL = (collectionEntity: CollectionEntity): Collection => {
    return {
        identifier: {
            collectionSlug: collectionEntity.collectionSlug
        }
    };
};

export const collectionSlugAvailable = async (
    _0: unknown,
    { collectionSlug }: { collectionSlug: string },
    context: Context
): Promise<boolean> => {
    const isReservedKeyword = ReservedKeywordsService.isReservedKeyword(collectionSlug);
    if (isReservedKeyword) {
        return false;
    }

    try {
        const collection = await getCollectionFromCacheOrDbOrFail(context, context.connection, collectionSlug);

        return collection == null;
    } catch (e) {
        if (e.message.includes("NOT_FOUND")) {
            return true;
        }
        throw e;
    }
};

export const usersByCollection = async (
    _0: unknown,
    { identifier }: { identifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<UserCollectionPermissions[]> => {
    const relations = getGraphQlRelationName(info);
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        identifier.collectionSlug
    );

    return await context.connection.manager
        .getCustomRepository(UserCollectionPermissionRepository)
        .usersByCollection(collectionEntity, relations);
};

export const createCollection = async (
    _0: unknown,
    { value }: { value: CreateCollectionInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Collection> => {
    ReservedKeywordsService.validateReservedKeyword(value.collectionSlug);
    const repository = context.connection.manager.getCustomRepository(CollectionRepository);

    const existingCollection = await repository.findCollectionBySlug(value.collectionSlug);
    if (existingCollection) {
        throw new ValidationError("COLLECTION_SLUG_NOT_AVAILABLE");
    }

    return context.connection.transaction(async (transaction) => {
        const relations = getGraphQlRelationName(info);

        const createdCollection = await transaction
            .getCustomRepository(CollectionRepository)
            .createCollection(context.me, value, relations);

        await grantAllCollectionPermissionsForUser(transaction, context.me.id, createdCollection.id);

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.COLLECTION_CREATED,
            targetCollectionId: createdCollection.id
        });

        return collectionEntityToGraphQL(createdCollection);
    });
};

export const updateCollection = async (
    _0: unknown,
    { identifier, value }: { identifier: CollectionIdentifierInput; value: UpdateCollectionInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Collection> => {
    const collection = context.connection.transaction(async (transaction) => {
        const repository = transaction.getCustomRepository(CollectionRepository);
        const collection = await repository.findCollectionBySlugOrFail(identifier.collectionSlug);

        if (
            value.isPublic != null &&
            value.isPublic !== collection.isPublic &&
            !(await hasCollectionPermissions(context, collection, Permission.MANAGE))
        ) {
            throw new ValidationError("NOT_AUTHORIZED - must be manager to change public status");
        }

        if (value.newCollectionSlug && identifier.collectionSlug !== value.newCollectionSlug) {
            ReservedKeywordsService.validateReservedKeyword(value.newCollectionSlug);
            const existingCollection = await repository.findCollectionBySlug(value.newCollectionSlug);
            if (existingCollection) {
                throw new ValidationError("COLLECTION_SLUG_NOT_AVAILABLE");
            }
        }

        if (value.isPublic !== undefined) {
            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.COLLECTION_PUBLIC_CHANGED,
                targetCollectionId: collection?.id,
                changeType: value.isPublic
                    ? ActivityLogChangeType.PUBLIC_ENABLED
                    : ActivityLogChangeType.PUBLIC_DISABLED
            });

            if (!value.isPublic) {
                await deleteCollectionFollowsForUsersWithNoPermissions(collection.id, transaction);
            }
        }

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.COLLECTION_EDIT,
            targetCollectionId: collection?.id,
            propertiesEdited: Object.keys(value).map((k) => (k === "newCollectionSlug" ? "slug" : k))
        });

        const relations = getGraphQlRelationName(info);
        const collectionEntity = await repository.updateCollection(identifier.collectionSlug, value, relations);

        return collectionEntityToGraphQL(collectionEntity);
    });

    context.cache.clear();

    return collection;
};

export const deleteCollectionFollowsForUsersWithNoPermissions = async (
    collectionId: number,
    manager: EntityManager
): Promise<DeleteResult> => {
    const packagePermissions = await getAllCollectionPermissions(manager, collectionId);
    const follows = await getCollectionFollowsByCollectionId(collectionId, manager);

    const userIds = packagePermissions.map((f) => f.userId);
    const distinctUserIds = new Set(userIds);

    const followsIdsToDelete = follows.filter((f) => !distinctUserIds.has(f.userId)).map((f) => f.id);

    return deleteFollowsByIds(followsIdsToDelete, manager);
};

export const myCollections = async (
    _0: unknown,
    { limit, offSet }: { limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{
    collections: Collection[];
    hasMore: boolean;
    count: number;
}> => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .myCollections(context.me, limit, offSet, relations);

    return {
        hasMore: count - (offSet + limit) > 0,
        collections: searchResponse.map((c) => collectionEntityToGraphQL(c)),
        count
    };
};

export const collectionPackages = async (
    _0: unknown,
    { identifier, limit, offset }: { identifier: CollectionIdentifierInput; limit: number; offset: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Package[]> => {
    const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .getUserByUsername(context.me?.username);

    if (!user) throw new UserInputError(`USER_NOT_FOUND - ${context.me.username}`);

    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        identifier.collectionSlug
    );
    const relations = getGraphQlRelationName(info);
    const entities = await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .collectionPackages(user.id, collectionEntity.id, limit, offset, relations);

    return entities.asyncMap((e) => packageEntityToGraphqlObject(context, context.connection, e));
};

export const setCollectionCoverImage = async (
    _0: unknown,
    { identifier, image }: { identifier: CollectionIdentifierInput; image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        identifier.collectionSlug
    );
    return ImageStorageService.INSTANCE.saveCollectionCoverImage(collectionEntity.id, image.base64);
};

export const deleteCollection = async (
    _0: unknown,
    { identifier }: { identifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return context.connection.transaction(async (transaction) => {
        const collectionEntity = await getCollectionFromCacheOrDbOrFail(
            context,
            transaction,
            identifier.collectionSlug
        );

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.COLLECTION_DELETED,
            targetCollectionId: collectionEntity.id
        });

        await transaction.getCustomRepository(CollectionRepository).deleteCollection(identifier.collectionSlug);
    });
};

export const addPackageToCollection = async (
    _0: unknown,
    {
        collectionIdentifier,
        packageIdentifier
    }: { collectionIdentifier: CollectionIdentifierInput; packageIdentifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<CollectionPackage> => {
    const repository = context.connection.manager.getCustomRepository(CollectionRepository);
    const collectionEntity = await repository.findCollectionBySlugOrFail(collectionIdentifier.collectionSlug);
    const identifier = packageIdentifier;
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier, relations: ["catalog"] });

    const hasVersions = await context.connection.manager
        .getCustomRepository(VersionRepository)
        .findVersions({ packageId: packageEntity.id });

    if (!hasVersions.length) throw new UserInputError("PACKAGE_HAS_NO_VERSIONS");

    await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .addPackageToCollection(context.me.id, collectionEntity.id, packageEntity.id);

    const relations = getGraphQlRelationName(info);

    // if (!relations.includes("collection")) relations.push("collection");

    const value = await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .findByCollectionIdAndPackageId(collectionEntity.id, packageEntity.id, relations);

    if (value == null)
        throw new ApolloError("Not able to find the CollectionPackage entry after entry. This should never happen!");

    collectionEntity.updatedAt = new Date();
    await repository.save(collectionEntity);

    await createActivityLog(context.connection, {
        userId: context.me.id,
        eventType: ActivityLogEventType.COLLECTION_PACKAGE_ADDED,
        targetCollectionId: value?.collectionId,
        targetPackageId: packageEntity.id
    });

    if (getEnvVariable("REGISTRY_URL") == null) {
        throw new Error("REGISTRY_URL environment variable not set!");
    }
    return {
        collection: {
            identifier: {
                collectionSlug: value.collection.collectionSlug
            }
        },
        package: {
            identifier: {
                registryURL: getEnvVariable("REGISTRY_URL"),
                catalogSlug: packageEntity.catalog.slug,
                packageSlug: packageEntity.slug
            }
        }
    };
};

export const removePackageFromCollection = async (
    _0: unknown,
    {
        collectionIdentifier,
        packageIdentifier
    }: { collectionIdentifier: CollectionIdentifierInput; packageIdentifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        collectionIdentifier.collectionSlug
    );
    const identifier = packageIdentifier;
    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier });

    await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .removePackageToCollection(collectionEntity.id, packageEntity.id);

    await createActivityLog(context.connection, {
        userId: context.me.id,
        eventType: ActivityLogEventType.COLLECTION_PACKAGE_REMOVED,
        targetCollectionId: collectionEntity.id,
        targetPackageId: packageEntity.id
    });
};

export const findCollectionsForAuthenticatedUser = async (
    _0: unknown,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Collection[]> => {
    const relations = getGraphQlRelationName(info);
    const collectionEntities = await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .findCollectionsForAuthenticatedUser(context.me.id, relations);

    return collectionEntities.map((c) => collectionEntityToGraphQL(c));
};

export const findCollectionBySlug = async (
    _0: unknown,
    { identifier }: { identifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Collection> => {
    return context.connection.transaction(async (transaction) => {
        const relations = getGraphQlRelationName(info);
        const collectionEntity = await getCollectionFromCacheOrDbOrFail(
            context,
            transaction,
            identifier.collectionSlug,
            relations
        );

        if (context.me) {
            await createActivityLog(transaction, {
                userId: context.me?.id,
                eventType: ActivityLogEventType.COLLECTION_VIEWED,
                targetCollectionId: collectionEntity.id
            });
        }

        return {
            identifier: {
                collectionSlug: collectionEntity.collectionSlug,
                registryURL: getEnvVariable("REGISTRY_URL")
            }
        };
    });
};

export const getPackageCollections = async (
    _0: unknown,
    { packageIdentifier, limit, offset }: { packageIdentifier: PackageIdentifierInput; limit: number; offset: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{ collections: Collection[]; hasMore: boolean; count: number }> => {
    const relations = getGraphQlRelationName(info);
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findOrFail({ identifier: packageIdentifier });
    const [collections, count] = await context.connection.manager
        .getCustomRepository(CollectionPackageRepository)
        .packageCollections(context.me.id, packageEntity.id, limit, offset, relations);

    return {
        hasMore: count - (offset + limit) > 0,
        collections: collections.map((c) => collectionEntityToGraphQL(c)),
        count
    };
};

export const searchCollections = async (
    _0: unknown,
    { query, limit, offset }: { query: string; limit: number; offset: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{
    collections: Collection[];
    hasMore: boolean;
    count: number;
}> => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .search(context.me?.id, query, limit, offset, relations);

    return {
        hasMore: count - (offset + limit) > 0,
        collections: searchResponse.map((c) => collectionEntityToGraphQL(c)),
        count
    };
};

export const userCollections = async (
    _0: unknown,
    { username, limit, offSet }: { username: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{
    collections: Collection[];
    hasMore: boolean;
    count: number;
}> => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .userCollections({ user: context.me, username, offSet: offSet, limit, relations });

    return {
        hasMore: count - (offSet + limit) > 0,
        collections: searchResponse.map((c) => collectionEntityToGraphQL(c)),
        count
    };
};

export const myPermissions = async (parent: Collection, _0: unknown, context: Context): Promise<Permission[]> => {
    const username = isAuthenticatedContext(context) ? (context as AuthenticatedContext).me.username : undefined;

    return userCollectionPermissions(
        context,
        {
            collectionSlug: parent.identifier.collectionSlug
        },
        username
    );
};

export const collectionIdentifier = async (
    parent: Collection,
    _1: unknown,
    context: Context
): Promise<CollectionIdentifier> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        parent.identifier.collectionSlug
    );
    if (!(await hasCollectionPermissions(context, collectionEntity, Permission.VIEW))) {
        return {
            registryURL: getEnvVariable("REGISTRY_URL"),
            collectionSlug: "private"
        };
    }

    return {
        registryURL: getEnvVariable("REGISTRY_URL"),
        collectionSlug: parent.identifier.collectionSlug
    };
};

export const collectionCreator = async (
    parent: Collection,
    _1: unknown,
    context: Context,
    info: GraphQLResolveInfo
): Promise<User | null> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        parent.identifier.collectionSlug,
        ["creator"]
    );
    if (!(await hasCollectionPermissions(context, collectionEntity, Permission.VIEW))) {
        return null;
    }

    return await getUserFromCacheOrDbByIdOrFail(
        context,
        context.connection,
        collectionEntity.creatorId,
        getGraphQlRelationName(info)
    );
};

export const collectionIsPublic = async (
    parent: Collection,
    _1: unknown,
    context: Context,
    info: GraphQLResolveInfo
): Promise<boolean> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        parent.identifier.collectionSlug
    );
    return collectionEntity.isPublic;
};

export const collectionIsRecommended = async (
    parent: Collection,
    _1: unknown,
    context: Context,
    info: GraphQLResolveInfo
): Promise<boolean> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        parent.identifier.collectionSlug
    );
    return collectionEntity.isRecommended;
};

export const collectionDescription = async (
    parent: Collection,
    _1: unknown,
    context: Context
): Promise<string | null> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        parent.identifier.collectionSlug
    );
    if (!(await hasCollectionPermissions(context, collectionEntity, Permission.VIEW))) {
        return null;
    }

    return collectionEntity.description || null;
};

export const collectionCreatedAt = async (parent: Collection, _1: unknown, context: Context): Promise<Date | null> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        parent.identifier.collectionSlug
    );
    if (!(await hasCollectionPermissions(context, collectionEntity, Permission.VIEW))) {
        return null;
    }

    return collectionEntity.createdAt || null;
};

export const collectionUpdatedAt = async (parent: Collection, _1: unknown, context: Context): Promise<Date | null> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        parent.identifier.collectionSlug
    );
    if (!(await hasCollectionPermissions(context, collectionEntity, Permission.VIEW))) {
        return null;
    }

    return collectionEntity.updatedAt || null;
};

export const collectionName = async (parent: Collection, _1: unknown, context: Context): Promise<string> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        parent.identifier.collectionSlug
    );
    if (!(await hasCollectionPermissions(context, collectionEntity, Permission.VIEW))) {
        return "private";
    }

    return collectionEntity.name;
};

export const userCollectionPermissions = async (
    context: Context,
    identifier: CollectionIdentifierInput,
    username?: string
): Promise<Permission[]> => {
    const collection = await getCollectionFromCacheOrDbOrFail(context, context.connection, identifier.collectionSlug);

    if (username == null) {
        if (collection.isPublic) {
            return [Permission.VIEW];
        } else {
            return [];
        }
    }

    const user = await getUserFromCacheOrDbByUsernameOrFail(context, username);
    const userPermission = await context.connection
        .getCustomRepository(UserCollectionPermissionRepository)
        .findCollectionPermissions({
            collectionId: collection.id,
            userId: user.id
        });

    if (userPermission) {
        return userPermission.permissions;
    }

    if (collection.isPublic) return [Permission.VIEW];

    return [];
};

export const getLatestCollections = async (
    _0: unknown,
    { limit, offset }: { limit: number; offset: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{
    collections: Collection[];
    hasMore: boolean;
    count: number;
}> => {
    const relations = getGraphQlRelationName(info);
    const [collections, count] = await context.connection.manager
        .getCustomRepository(CollectionRepository)
        .getLatestCollections(context.me?.id, limit, offset, relations);

    return {
        hasMore: count - (offset + limit) > 0,
        collections: collections.map((c) => collectionEntityToGraphQL(c)),
        count
    };
};

export const getMyRecentlyViewedPackages = async (
    _0: unknown,
    { limit, offset }: { limit: number; offset: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<ActivityLogResult> => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(ActivityLogRepository)
        .myRecentlyViewedCollections(context.me, limit, offset, relations);

    return {
        hasMore: count - (offset + limit) > 0,
        logs: await Promise.all(searchResponse.map((c) => activtyLogEntityToGraphQL(context, context.connection, c))),
        count
    };
};

export const getCollectionFromCacheOrDbById = async (
    context: Context,
    connection: EntityManager | Connection,
    id: number
): Promise<CollectionEntity | null> => {
    const collectionPromiseFunction = () => connection.getCustomRepository(CollectionRepository).findOneOrFail({ id });
    return await context.cache.loadCollection(id, collectionPromiseFunction);
};

export const getCollectionFromCacheOrDbOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    slug: string,
    relations: string[] = []
): Promise<CollectionEntity> => {
    const collectionPromiseFunction = () =>
        connection.getCustomRepository(CollectionRepository).findCollectionBySlugOrFail(slug, relations);

    const response = await context.cache.loadCollectionBySlug(slug, collectionPromiseFunction);

    if (response == null) {
        throw new Error("COLLECTION_NOT_FOUND");
    }

    return response;
};

export const getCollectionFromCacheOrDbByIdOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    id: number
): Promise<CollectionEntity> => {
    const response = await getCollectionFromCacheOrDbById(context, connection, id);
    if (response == null) {
        throw new Error("COLLECTION_NOT_FOUND");
    }
    return response;
};
