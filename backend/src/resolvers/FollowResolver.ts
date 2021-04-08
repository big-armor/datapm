import graphqlFields from "graphql-fields";
import { AuthenticatedContext } from "../context";
import { FollowEntity } from "../entity/FollowEntity";
import {
    SaveFollowInput,
    NotificationEventType,
    FollowIdentifierInput,
    Follow,
    NotificationFrequency,
    FollowType,
    MyFollowsResult
} from "../generated/graphql";
import { getCatalogOrFail } from "../repository/CatalogRepository";
import { CollectionRepository } from "../repository/CollectionRepository";
import { FollowRepository } from "../repository/FollowRepository";
import { PackageIssueRepository } from "../repository/PackageIssueRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { getGraphQlRelationName } from "../util/relationNames";

export const entityToGraphqlObject = (entity: FollowEntity | undefined) => {
    if (!entity) {
        return {
            notificationFrequency: NotificationFrequency.NEVER,
            eventTypes: []
        };
    }

    return {
        notificationFrequency: entity.notificationFrequency,
        eventTypes: entity.eventTypes
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

    // TODO: CHECK FOR PERMISSIONS
    if (follow.catalog) {
        const catalog = await getCatalogOrFail({ slug: follow.catalog.catalogSlug, manager });
        existingFollowEntity = await followRepository.getFollowByCatalogId(userId, catalog.id);

        followEntity.catalogId = catalog.id;
        followEntity.eventTypes = getCatalogEventTypes();
    } else if (follow.collection) {
        const collection = await manager
            .getCustomRepository(CollectionRepository)
            .findCollectionBySlugOrFail(follow.collection.collectionSlug);
        existingFollowEntity = await followRepository.getFollowByCollectionId(userId, collection.id);

        followEntity.collectionId = collection.id;
        followEntity.eventTypes = getCollectionEventTypes();
    } else if (follow.package) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.package });
        existingFollowEntity = await followRepository.getFollowByPackageId(userId, packageEntity.id);

        followEntity.packageId = packageEntity.id;
        followEntity.eventTypes = getPackageEventTypes();
    } else if (follow.packageIssue) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.packageIssue.packageIdentifier });
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
): Promise<Follow> => {
    const manager = context.connection.manager;
    const userId = context.me.id;
    const followRepository = manager.getCustomRepository(FollowRepository);

    // TODO: CHECK FOR PERMISSIONS
    if (follow.catalog) {
        const catalog = await getCatalogOrFail({ slug: follow.catalog.catalogSlug, manager });
        const entity = await followRepository.getFollowByCatalogId(userId, catalog.id);
        return entityToGraphqlObject(entity);
    } else if (follow.collection) {
        const collection = await manager
            .getCustomRepository(CollectionRepository)
            .findCollectionBySlugOrFail(follow.collection.collectionSlug);
        const entity = await followRepository.getFollowByCollectionId(userId, collection.id);
        return entityToGraphqlObject(entity);
    } else if (follow.package) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.package });
        const entity = await followRepository.getFollowByPackageId(userId, packageEntity.id);
        return entityToGraphqlObject(entity);
    } else if (follow.packageIssue) {
        const packageEntity = await manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: follow.packageIssue.packageIdentifier });
        const issueEntity = await manager
            .getCustomRepository(PackageIssueRepository)
            .getIssueByPackageAndIssueNumber(packageEntity.id, follow.packageIssue.issueNumber);
        const entity = await followRepository.getFollowByPackageIssueId(userId, issueEntity.id);
        return entityToGraphqlObject(entity);
    } else if (follow.user) {
        const userEntity = await manager
            .getCustomRepository(UserRepository)
            .findUser({ username: follow.user.username });
        const entity = await followRepository.getFollowByUserId(userId, userEntity.id);
        return entityToGraphqlObject(entity);
    } else {
        throw new Error("FOLLOW_NOT_FOUND");
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
    const relations = getGraphQlRelationName(info);
    console.log("wowz", relations);
    let followEntities = [];
    let count = 0;

    switch (type) {
        case FollowType.CATALOG:
            let [catalogFollows, cfCount] = await followRepository.getCatalogFollows(userId, offset, limit, relations);
            followEntities = catalogFollows;
            count = cfCount;
            break;
        case FollowType.COLLECTION:
            let [collectionFollows, clCount] = await followRepository.getCollectionFollows(
                userId,
                offset,
                limit,
                relations
            );
            followEntities = collectionFollows;
            count = clCount;
            break;
        case FollowType.PACKAGE:
            let [packageFollows, pkgCount] = await followRepository.getPackageFollows(userId, offset, limit, relations);
            followEntities = packageFollows;
            count = pkgCount;
            break;
        case FollowType.PACKAGE_ISSUE:
            let [packageIssueFollows, pkgICount] = await followRepository.getPackageIssueFollows(
                userId,
                offset,
                limit,
                relations
            );
            followEntities = packageIssueFollows;
            count = pkgICount;
            break;
        case FollowType.USER:
            let [userFollows, uCount] = await followRepository.getUserFollows(userId, offset, limit, relations);
            followEntities = userFollows;
            count = uCount;
            break;
    }

    return {
        follows: followEntities.map((f) => entityToGraphqlObject(f)),
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

    // TODO: CHECK FOR PERMISSIONS
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
