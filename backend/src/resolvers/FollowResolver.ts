import { EntityManager } from "typeorm";
import { resolveCatalogPermissionsForEntity } from "../directive/hasCatalogPermissionDirective";
import { AuthenticatedContext, Context } from "../context";
import { FollowEntity } from "../entity/FollowEntity";
import {
    SaveFollowInput,
    NotificationEventType,
    FollowIdentifierInput,
    Follow,
    FollowType,
    MyFollowsResult,
    Package,
    Collection,
    Permission,
    PackageIdentifierInput,
    FollowersResult,
    PackageIssueIdentifierInput,
    CatalogIdentifierInput,
    CollectionIdentifierInput,
    ActivityLogChangeType
} from "../generated/graphql";
import { getCatalogOrFail } from "../repository/CatalogRepository";
import { CollectionRepository } from "../repository/CollectionRepository";
import { FollowRepository } from "../repository/FollowRepository";
import { PackageIssueRepository } from "../repository/PackageIssueRepository";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserCollectionPermissionRepository } from "../repository/UserCollectionPermissionRepository";
import { UserRepository } from "../repository/UserRepository";
import { catalogEntityToGraphQLOrNull, getCatalogFromCacheOrDbOrFail } from "./CatalogResolver";
import { collectionEntityToGraphQLOrNull, getCollectionFromCacheOrDbOrFail } from "./CollectionResolver";
import { packageEntityToGraphqlObject, packageEntityToGraphqlObjectOrNull } from "./PackageResolver";
import { getPackageIssueByIdentifiers } from "./PackageIssueResolver";
import { getUserFromCacheOrDbByUsername } from "./UserResolver";

export const entityToGraphqlObject = async (context: Context, entity: FollowEntity | undefined) => {
    if (!entity) {
        return null;
    }

    return {
        notificationFrequency: entity.notificationFrequency,
        eventTypes: entity.eventTypes || [],
        changeType: entity.changeType || [],
        followAllPackages: entity.followAllPackages,
        followAllPackageIssues: entity.followAllPackageIssues,
        catalog: catalogEntityToGraphQLOrNull(entity.catalog),
        collection: collectionEntityToGraphQLOrNull(entity.collection),
        package: await packageEntityToGraphqlObjectOrNull(context, context.connection, entity.package),
        packageIssue: entity.packageIssue,
        user: entity.targetUser
    };
};

export const saveFollow = async (
    _0: any,
    { follow }: { follow: SaveFollowInput },
    context: AuthenticatedContext,
    info: any
): Promise<void> => {
    const manager = context.connection.manager;
    const userId = context.me.id;
    const followRepository = manager.getCustomRepository(FollowRepository);

    let existingFollowEntity;
    const followEntity = new FollowEntity();
    followEntity.userId = userId;
    followEntity.notificationFrequency = follow.notificationFrequency;
    followEntity.followAllPackages = follow.followAllPackages || false;
    followEntity.followAllPackageIssues = follow.followAllPackageIssues || false;
    followEntity.changeType = (follow.changeType || []) as ActivityLogChangeType[];

    if (follow.catalog) {
        const catalog = await getCatalogOrFail({ slug: follow.catalog.catalogSlug, manager });
        existingFollowEntity = await followRepository.getFollowByCatalogId(userId, catalog.id);

        const hasViewPermission = (await resolveCatalogPermissionsForEntity(context, catalog)).includes(
            Permission.VIEW
        );

        if (!hasViewPermission) {
            throw new Error("NOT_AUTHORIZED");
        }

        followEntity.catalogId = catalog.id;
        followEntity.eventTypes = getCatalogEventTypes(follow);
    } else if (follow.collection) {
        const collection = await manager
            .getCustomRepository(CollectionRepository)
            .findCollectionBySlugOrFail(follow.collection.collectionSlug);

        const hasPermission = await manager
            .getCustomRepository(UserCollectionPermissionRepository)
            .hasPermission(userId, collection, Permission.VIEW);

        if (!hasPermission) {
            throw new Error("NOT_AUTHORIZED");
        }

        existingFollowEntity = await followRepository.getFollowByCollectionId(userId, collection.id);

        followEntity.collectionId = collection.id;
        followEntity.eventTypes = getCollectionEventTypes(follow);
    } else if (follow.package) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.package });

        const hasPermission = await manager
            .getCustomRepository(PackagePermissionRepository)
            .hasPermission(userId, packageEntity, Permission.VIEW);
        if (!hasPermission) {
            throw new Error("NOT_AUTHORIZED");
        }

        existingFollowEntity = await followRepository.getFollowByPackageId(userId, packageEntity.id);

        followEntity.packageId = packageEntity.id;
        followEntity.eventTypes = getDefaultPackageEventTypes();
    } else if (follow.packageIssue) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.packageIssue.packageIdentifier });

        if (!packageEntity.isPublic) {
            const hasPermission = await manager
                .getCustomRepository(PackagePermissionRepository)
                .hasPermission(userId, packageEntity, Permission.VIEW);
            if (!hasPermission) {
                throw new Error("NOT_AUTHORIZED");
            }
        }

        const issueEntity = await manager
            .getCustomRepository(PackageIssueRepository)
            .getIssueByPackageAndIssueNumber(packageEntity.id, follow.packageIssue.issueNumber);
        existingFollowEntity = await followRepository.getFollowByPackageIssueId(userId, issueEntity.id);

        followEntity.packageIssueId = issueEntity.id;
        followEntity.eventTypes = getPackageIssueEventTypes();
    } else if (follow.user) {
        const userEntity = await manager
            .getCustomRepository(UserRepository)
            .findUser({ username: follow.user.username });
        existingFollowEntity = await followRepository.getFollowByUserId(userId, userEntity.id);

        followEntity.targetUserId = userEntity.id;
        followEntity.eventTypes = getUserEventTypes(follow);
        followEntity.changeType.push(ActivityLogChangeType.VERSION_FIRST_VERSION);
    }

    if (existingFollowEntity) {
        followEntity.id = existingFollowEntity.id;
    }
    await followRepository.save(followEntity);
};

export const getFollow = async (
    _0: any,
    { follow }: { follow: FollowIdentifierInput },
    context: AuthenticatedContext,
    info: any
): Promise<Follow | null> => {
    const manager = context.connection.manager;
    const userId = context.me.id;
    const followRepository = manager.getCustomRepository(FollowRepository);

    if (follow.catalog) {
        const catalog = await getCatalogOrFail({ slug: follow.catalog.catalogSlug, manager });
        const entity = await followRepository.getFollowByCatalogId(userId, catalog.id);
        if (!entity) {
            return null;
        }

        return await entityToGraphqlObject(context, entity);
    } else if (follow.collection) {
        const collection = await manager
            .getCustomRepository(CollectionRepository)
            .findCollectionBySlugOrFail(follow.collection.collectionSlug);
        const entity = await followRepository.getFollowByCollectionId(userId, collection.id);
        return await entityToGraphqlObject(context, entity);
    } else if (follow.package) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.package });
        const entity = await followRepository.getFollowByPackageId(userId, packageEntity.id);
        return await entityToGraphqlObject(context, entity);
    } else if (follow.packageIssue) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.packageIssue.packageIdentifier });
        const issueEntity = await manager
            .getCustomRepository(PackageIssueRepository)
            .getIssueByPackageAndIssueNumber(packageEntity.id, follow.packageIssue.issueNumber);
        const entity = await followRepository.getFollowByPackageIssueId(userId, issueEntity.id);
        return await entityToGraphqlObject(context, entity);
    } else if (follow.user) {
        const userEntity = await manager
            .getCustomRepository(UserRepository)
            .findUser({ username: follow.user.username });
        const entity = await followRepository.getFollowByUserId(userId, userEntity.id);
        return await entityToGraphqlObject(context, entity);
    } else {
        throw new Error("FOLLOW_TYPE_NOT_FOUND");
    }
};

export const getAllMyFollows = async (
    _0: any,
    { type, offset, limit }: { type: FollowType; offset: number; limit: number },
    context: AuthenticatedContext,
    info: any
): Promise<MyFollowsResult> => {
    const manager = context.connection.manager;
    const userId = context.me.id;
    const followRepository = manager.getCustomRepository(FollowRepository);
    let followEntities: FollowEntity[] = [];
    let count = 0;

    switch (type) {
        case FollowType.CATALOG:
            const [catalogFollows, cfCount] = await followRepository.getCatalogFollows(userId, offset, limit, [
                "catalog"
            ]);
            followEntities = catalogFollows;
            count = cfCount;
            break;
        case FollowType.COLLECTION:
            const [collectionFollows, clCount] = await followRepository.getCollectionFollows(userId, offset, limit, [
                "collection"
            ]);
            followEntities = collectionFollows;
            count = clCount;
            break;
        case FollowType.PACKAGE:
            const [packageFollows, pkgCount] = await followRepository.getPackageFollows(userId, offset, limit, [
                "package"
            ]);
            followEntities = packageFollows;
            count = pkgCount;
            break;
        case FollowType.PACKAGE_ISSUE:
            const [packageIssueFollows, pkgICount] = await followRepository.getPackageIssueFollows(
                userId,
                offset,
                limit,
                ["packageIssue"]
            );
            followEntities = packageIssueFollows;
            count = pkgICount;
            break;
        case FollowType.USER:
            const [userFollows, uCount] = await followRepository.getUserFollows(userId, offset, limit, ["targetUser"]);
            followEntities = userFollows;
            count = uCount;
            break;
    }

    const follows: Follow[] = [];

    for (const f of followEntities) {
        const follow = await entityToGraphqlObject(context, f);
        if (follow) {
            follows.push(follow);
        }
    }

    return {
        follows: follows,
        hasMore: count - (offset + limit) > 0,
        count
    };
};

export const deleteFollow = async (
    _0: any,
    { follow }: { follow: FollowIdentifierInput },
    context: AuthenticatedContext,
    info: any
): Promise<void> => {
    const manager = context.connection.manager;
    const userId = context.me.id;
    const followRepository = manager.getCustomRepository(FollowRepository);

    if (follow.catalog) {
        const catalog = await getCatalogOrFail({ slug: follow.catalog.catalogSlug, manager });
        await followRepository.deleteFollowByCatalogId(userId, catalog.id);
    } else if (follow.collection) {
        const collection = await manager
            .getCustomRepository(CollectionRepository)
            .findCollectionBySlugOrFail(follow.collection.collectionSlug);
        await followRepository.deleteFollowByCollectionId(userId, collection.id);
    } else if (follow.package) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.package });
        await followRepository.deleteFollowByPackageId(userId, packageEntity.id);
    } else if (follow.packageIssue) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.packageIssue.packageIdentifier });
        const issueEntity = await manager
            .getCustomRepository(PackageIssueRepository)
            .getIssueByPackageAndIssueNumber(packageEntity.id, follow.packageIssue.issueNumber);
        await followRepository.deleteFollowByPackageIssueId(userId, issueEntity.id);
    } else if (follow.user) {
        const userEntity = await manager
            .getCustomRepository(UserRepository)
            .findUser({ username: follow.user.username });
        await followRepository.deleteFollowByUserId(userId, userEntity.id);
    } else {
        throw new Error("FOLLOW_TYPE_UNKNOWN");
    }
};

export const deleteAllMyFollows = async (_0: any, { }, context: AuthenticatedContext, info: any): Promise<void> => {
    const manager = context.connection.manager;
    await manager.getCustomRepository(FollowRepository).deleteAllFollowsByUserId(context.me.id);
};

const getCatalogEventTypes = (follow: SaveFollowInput): NotificationEventType[] => {
    const events = [NotificationEventType.CATALOG_PACKAGE_ADDED, NotificationEventType.CATALOG_PACKAGE_REMOVED];

    const packageEvents = getChildPackagesEventTypes(follow);
    events.push(...packageEvents);

    const packageIssuesEvents = getChildPackageIssuesEventTypes(follow);
    events.push(...packageIssuesEvents);

    return events;
};

const getCollectionEventTypes = (follow: SaveFollowInput): NotificationEventType[] => {
    const events = [NotificationEventType.COLLECTION_PACKAGE_ADDED, NotificationEventType.COLLECTION_PACKAGE_REMOVED];

    const packageEvents = getChildPackagesEventTypes(follow);
    events.push(...packageEvents);

    const packageIssuesEvents = getChildPackageIssuesEventTypes(follow);
    events.push(...packageIssuesEvents);

    return events;
};

const getPackageIssueEventTypes = (): NotificationEventType[] => {
    return [NotificationEventType.PACKAGE_ISSUE_STATUS_CHANGE, NotificationEventType.PACKAGE_ISSUE_COMMENT_CREATED];
};

const getUserEventTypes = (follow: SaveFollowInput): NotificationEventType[] => {
    const events = [NotificationEventType.PACKAGE_CREATED, NotificationEventType.VERSION_CREATED];

    const packageEvents = getDefaultPackageEventTypes();
    events.push(...packageEvents);

    return events;
};

const getDefaultPackageEventTypes = (): NotificationEventType[] => {
    return [
        NotificationEventType.VERSION_CREATED,
        NotificationEventType.PACKAGE_MAJOR_CHANGE,
        NotificationEventType.PACKAGE_MINOR_CHANGE,
        NotificationEventType.PACKAGE_PATCH_CHANGE
    ];
};

const getChildPackagesEventTypes = (follow: SaveFollowInput) => {
    if (!follow.followAllPackages) {
        return [];
    }

    return getPackageEventTypes(follow);
}

const getChildPackageIssuesEventTypes = (follow: SaveFollowInput) => {
    if (!follow.followAllPackageIssues) {
        return [];
    }

    return [NotificationEventType.PACKAGE_ISSUE_STATUS_CHANGE, NotificationEventType.PACKAGE_ISSUE_COMMENT_CREATED];
}

const getPackageEventTypes = (follow: SaveFollowInput) => {
    const requiredChangeTypes = getRequiredPackageChangeTypes();
    const changeTypes = (follow.changeType || []) as ActivityLogChangeType[];
    const hasPackageSettings = changeTypes.some((p) => requiredChangeTypes.includes(p));
    if (!hasPackageSettings) {
        throw new Error("MISSING_PACKAGE_CHANGE_TYPES");
    }

    return getPackageNotificationEventTypes(changeTypes);
}

const getPackageNotificationEventTypes = (changeTypes: ActivityLogChangeType[]) => {
    const eventTypes = changeTypes
        .map((c) => convertLogChangeTypeToNotificationType(c))
        .filter((c) => c != null) as NotificationEventType[];

    eventTypes.push(NotificationEventType.VERSION_CREATED);
    return eventTypes;
}

const convertLogChangeTypeToNotificationType = (logChangeType: ActivityLogChangeType) => {
    switch (logChangeType) {
        case ActivityLogChangeType.VERSION_PATCH_CHANGE:
            return NotificationEventType.PACKAGE_PATCH_CHANGE;
        case ActivityLogChangeType.VERSION_MINOR_CHANGE:
            return NotificationEventType.PACKAGE_MINOR_CHANGE;
        case ActivityLogChangeType.VERSION_MAJOR_CHANGE:
            return NotificationEventType.PACKAGE_MAJOR_CHANGE;
        default:
            return null;
    }
}

const getRequiredPackageChangeTypes = (): ActivityLogChangeType[] => {
    return [
        ActivityLogChangeType.VERSION_PATCH_CHANGE,
        ActivityLogChangeType.VERSION_MINOR_CHANGE,
        ActivityLogChangeType.VERSION_MAJOR_CHANGE
    ];
};

export const followPackage = async (
    parent: Follow,
    _1: any,
    context: AuthenticatedContext,
    info: any
): Promise<Package | null> => {
    if (!parent.package) {
        return null;
    }

    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: parent.package.identifier });
    return packageEntityToGraphqlObject(context, context.connection, packageEntity);
};

export const packageFollowers = async (
    _1: any,
    { identifier, offset, limit }: { identifier: PackageIdentifierInput; offset: number; limit: number },
    context: AuthenticatedContext,
    info: any
): Promise<FollowersResult> => {
    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier });

    const [followers, count] = await context.connection
        .getCustomRepository(FollowRepository)
        .getFollowersByPackageId(packageEntity.id, offset, limit);

    return {
        followers,
        count,
        hasMore: count - (limit + offset) > 0
    };
};

export const packageIssueFollowers = async (
    _1: any,
    {
        identifier,
        issueIdentifier,
        offset,
        limit
    }: {
        identifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        offset: number;
        limit: number;
    },
    context: AuthenticatedContext,
    info: any
): Promise<FollowersResult> => {
    const packageIssueEntity = await getPackageIssueByIdentifiers(context.connection, identifier, issueIdentifier);

    const [followers, count] = await context.connection
        .getCustomRepository(FollowRepository)
        .getFollowersByPackageIssueId(packageIssueEntity.id, offset, limit);

    return {
        followers,
        count,
        hasMore: count - (limit + offset) > 0
    };
};

export const catalogFollowers = async (
    _1: any,
    { identifier, offset, limit }: { identifier: CatalogIdentifierInput; offset: number; limit: number },
    context: AuthenticatedContext,
    info: any
): Promise<FollowersResult> => {
    const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, identifier);

    const [followers, count] = await context.connection
        .getCustomRepository(FollowRepository)
        .getFollowersByCatalogId(catalogEntity.id, offset, limit);

    return {
        followers,
        count,
        hasMore: count - (limit + offset) > 0
    };
};

export const collectionFollowers = async (
    _1: any,
    { identifier, offset, limit }: { identifier: CollectionIdentifierInput; offset: number; limit: number },
    context: AuthenticatedContext,
    info: any
): Promise<FollowersResult> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        identifier.collectionSlug
    );

    const [followers, count] = await context.connection
        .getCustomRepository(FollowRepository)
        .getFollowersByCollectionId(collectionEntity.id, offset, limit);

    return {
        followers,
        count,
        hasMore: count - (limit + offset) > 0
    };
};

export const userFollowers = async (
    _1: any,
    { username, offset, limit }: { username: string; offset: number; limit: number },
    context: AuthenticatedContext,
    info: any
): Promise<FollowersResult> => {
    const userEntity = await getUserFromCacheOrDbByUsername(context, username);

    const [followers, count] = await context.connection
        .getCustomRepository(FollowRepository)
        .getFollowersByUserId(userEntity.id, offset, limit);

    return {
        followers,
        count,
        hasMore: count - (limit + offset) > 0
    };
};

export const packageFollowersCount = async (
    _1: any,
    { identifier }: { identifier: PackageIdentifierInput },
    context: AuthenticatedContext,
    info: any
): Promise<number> => {
    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier });

    return await context.connection
        .getCustomRepository(FollowRepository)
        .getFollowersByPackageIdCount(packageEntity.id);
};

export const packageIssueFollowersCount = async (
    _1: any,
    {
        identifier,
        issueIdentifier
    }: { identifier: PackageIdentifierInput; issueIdentifier: PackageIssueIdentifierInput },
    context: AuthenticatedContext,
    info: any
): Promise<number> => {
    const packageIssueEntity = await getPackageIssueByIdentifiers(context.connection, identifier, issueIdentifier);

    return await context.connection
        .getCustomRepository(FollowRepository)
        .getFollowersByPackageIssueIdCount(packageIssueEntity.id);
};

export const catalogFollowersCount = async (
    _1: any,
    { identifier }: { identifier: CatalogIdentifierInput },
    context: AuthenticatedContext,
    info: any
): Promise<number> => {
    const catalogEntity = await getCatalogFromCacheOrDbOrFail(context, identifier);

    return await context.connection
        .getCustomRepository(FollowRepository)
        .getFollowersByCatalogIdCount(catalogEntity.id);
};

export const collectionFollowersCount = async (
    _1: any,
    { identifier }: { identifier: CollectionIdentifierInput },
    context: AuthenticatedContext,
    info: any
): Promise<number> => {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        identifier.collectionSlug
    );

    return await context.connection
        .getCustomRepository(FollowRepository)
        .getFollowersByCollectionIdCount(collectionEntity.id);
};

export const userFollowersCount = async (
    _1: any,
    { username }: { username: string },
    context: AuthenticatedContext,
    info: any
): Promise<number> => {
    const userEntity = await getUserFromCacheOrDbByUsername(context, username);

    return await context.connection.getCustomRepository(FollowRepository).getFollowersByUserIdCount(userEntity.id);
};

export const followCollection = async (
    parent: Follow,
    _1: any,
    context: AuthenticatedContext,
    info: any
): Promise<Collection | null> => {
    if (!parent.collection) {
        return null;
    }

    return parent.collection;
};

export const getPackageFollowsByPackageId = async (packageId: number, manager: EntityManager) => {
    return await manager.getCustomRepository(FollowRepository).getFollowsByPackageId(packageId);
};

export const getPackageFollowsByPackageIssuesIds = async (packageIssueIds: number[], manager: EntityManager) => {
    if (packageIssueIds == null || packageIssueIds.length === 0) {
        return [];
    }

    return await manager.getCustomRepository(FollowRepository).getFollowsByPackageIssuesIds(packageIssueIds);
};

export const getCatalogFollowsByCatalogId = async (catalogId: number, manager: EntityManager) => {
    return await manager.getCustomRepository(FollowRepository).getFollowsByCatalogId(catalogId);
};

export const getCollectionFollowsByCollectionId = async (collectionId: number, manager: EntityManager) => {
    return await manager.getCustomRepository(FollowRepository).getFollowsByCollectionId(collectionId);
};

export const deletePackageFollowByUserId = async (manager: EntityManager, packageId: number, userId: number) => {
    return await manager.getCustomRepository(FollowRepository).deleteFollowByPackageId(userId, packageId);
};

export const deletePackageIssuesFollowsByUserId = async (manager: EntityManager, packageId: number, userId: number) => {
    const packageIssues = await manager.getCustomRepository(PackageIssueRepository).getAllIssuesByPackage(packageId);
    const packageIssuesIds = packageIssues.map((p) => p.id);
    return await manager.getCustomRepository(FollowRepository).deleteFollowsByPackageIssueIds(userId, packageIssuesIds);
};

export const deleteCatalogFollowByUserId = async (manager: EntityManager, catalogId: number, userId: number) => {
    return await manager.getCustomRepository(FollowRepository).deleteFollowByCatalogId(userId, catalogId);
};

export const deleteCollectionFollowByUserId = async (manager: EntityManager, collectionId: number, userId: number) => {
    return await manager.getCustomRepository(FollowRepository).deleteFollowByCollectionId(userId, collectionId);
};

export const deleteFollowsByIds = async (ids: number[], manager: EntityManager) => {
    if (!ids || !ids.length) {
        return;
    }

    return await manager.getCustomRepository(FollowRepository).delete(ids);
};
