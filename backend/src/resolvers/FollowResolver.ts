import { Connection, EntityManager } from "typeorm";
import { AuthenticatedContext } from "../context";
import { resolveCatalogPermissionsForEntity } from "../directive/hasCatalogPermissionDirective";
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
    Permission
} from "../generated/graphql";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { getCatalogOrFail } from "../repository/CatalogRepository";
import { CollectionRepository } from "../repository/CollectionRepository";
import { FollowRepository } from "../repository/FollowRepository";
import { PackageIssueRepository } from "../repository/PackageIssueRepository";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserCollectionPermissionRepository } from "../repository/UserCollectionPermissionRepository";
import { UserRepository } from "../repository/UserRepository";
import { catalogEntityToGraphQLOrNull } from "./CatalogResolver";
import { collectionEntityToGraphQLOrNull } from "./CollectionResolver";
import { packageEntityToGraphqlObject, packageEntityToGraphqlObjectOrNull } from "./PackageResolver";

export const entityToGraphqlObject = async (context: EntityManager | Connection, entity: FollowEntity | undefined) => {
    if (!entity) {
        return null;
    }

    return {
        notificationFrequency: entity.notificationFrequency,
        eventTypes: entity.eventTypes || [],
        catalog: catalogEntityToGraphQLOrNull(entity.catalog),
        collection: collectionEntityToGraphQLOrNull(entity.collection),
        package: await packageEntityToGraphqlObjectOrNull(context, entity.package),
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

    if (follow.catalog) {
        const catalog = await getCatalogOrFail({ slug: follow.catalog.catalogSlug, manager });
        existingFollowEntity = await followRepository.getFollowByCatalogId(userId, catalog.id);

        // check that this user has the right to move this package to a different catalog
        const hasViewPermission = (await resolveCatalogPermissionsForEntity(context, catalog)).includes(
            Permission.VIEW
        );

        if (!hasViewPermission) {
            throw new Error("NOT_AUTHORIZED");
        }

        followEntity.catalogId = catalog.id;
        followEntity.eventTypes = getCatalogEventTypes();
    } else if (follow.collection) {
        const collection = await manager
            .getCustomRepository(CollectionRepository)
            .findCollectionBySlugOrFail(follow.collection.collectionSlug);

        const hasPermission = await manager
            .getCustomRepository(UserCollectionPermissionRepository)
            .hasPermission(userId, collection.id, Permission.VIEW);
        if (!hasPermission) {
            throw new Error("NOT_AUTHORIZED");
        }

        existingFollowEntity = await followRepository.getFollowByCollectionId(userId, collection.id);

        followEntity.collectionId = collection.id;
        followEntity.eventTypes = getCollectionEventTypes();
    } else if (follow.package) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.package });

        const hasPermission = await manager
            .getCustomRepository(PackagePermissionRepository)
            .hasPermission(userId, packageEntity.id, Permission.VIEW);
        if (!hasPermission) {
            throw new Error("NOT_AUTHORIZED");
        }

        existingFollowEntity = await followRepository.getFollowByPackageId(userId, packageEntity.id);

        followEntity.packageId = packageEntity.id;
        followEntity.eventTypes = getPackageEventTypes();
    } else if (follow.packageIssue) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.packageIssue.packageIdentifier });

        const hasPermission = await manager
            .getCustomRepository(PackagePermissionRepository)
            .hasPermission(userId, packageEntity.id, Permission.VIEW);
        if (!hasPermission) {
            throw new Error("NOT_AUTHORIZED");
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
        followEntity.eventTypes = getUserEventTypes();
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

        return await entityToGraphqlObject(context.connection, entity);
    } else if (follow.collection) {
        const collection = await manager
            .getCustomRepository(CollectionRepository)
            .findCollectionBySlugOrFail(follow.collection.collectionSlug);
        const entity = await followRepository.getFollowByCollectionId(userId, collection.id);
        return await entityToGraphqlObject(context.connection, entity);
    } else if (follow.package) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.package });
        const entity = await followRepository.getFollowByPackageId(userId, packageEntity.id);
        return await entityToGraphqlObject(context.connection, entity);
    } else if (follow.packageIssue) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.packageIssue.packageIdentifier });
        const issueEntity = await manager
            .getCustomRepository(PackageIssueRepository)
            .getIssueByPackageAndIssueNumber(packageEntity.id, follow.packageIssue.issueNumber);
        const entity = await followRepository.getFollowByPackageIssueId(userId, issueEntity.id);
        return await entityToGraphqlObject(context.connection, entity);
    } else if (follow.user) {
        const userEntity = await manager
            .getCustomRepository(UserRepository)
            .findUser({ username: follow.user.username });
        const entity = await followRepository.getFollowByUserId(userId, userEntity.id);
        return await entityToGraphqlObject(context.connection, entity);
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
        const follow = await entityToGraphqlObject(context.connection, f);
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

export const deleteAllMyFollows = async (_0: any, {}, context: AuthenticatedContext, info: any): Promise<void> => {
    const manager = context.connection.manager;
    await manager.getCustomRepository(FollowRepository).deleteAllFollowsByUserId(context.me.id);
};

const getCatalogEventTypes = (): NotificationEventType[] => {
    return [NotificationEventType.CATALOG_PACKAGE_ADDED, NotificationEventType.CATALOG_PACKAGE_REMOVED];
};

const getCollectionEventTypes = (): NotificationEventType[] => {
    return [NotificationEventType.COLLECTION_PACKAGE_ADDED, NotificationEventType.COLLECTION_PACKAGE_REMOVED];
};

const getPackageEventTypes = (): NotificationEventType[] => {
    return [
        NotificationEventType.PACKAGE_MAJOR_CHANGE,
        NotificationEventType.PACKAGE_MINOR_CHANGE,
        NotificationEventType.PACKAGE_PATCH_CHANGE
    ];
};

const getPackageIssueEventTypes = (): NotificationEventType[] => {
    return [NotificationEventType.PACKAGE_ISSUE_STAUS_CHANGE, NotificationEventType.PACKAGE_ISSUE_COMMENT_ADDED];
};

const getUserEventTypes = (): NotificationEventType[] => {
    return [];
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
    return packageEntityToGraphqlObject(context.connection, packageEntity);
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
