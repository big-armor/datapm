import { Connection, EntityManager, In } from "typeorm";
import graphqlFields from "graphql-fields";

import { AuthenticatedContext, Context } from "../context";
import { ActivityLogEntity } from "../entity/ActivityLogEntity";
import { getRelationNames } from "../util/relationNames";
import {
    ActivityLog,
    ActivityLogEventType,
    ActivityLogFilterInput,
    ActivityLogResult,
    Catalog,
    Collection,
    CollectionIdentifierInput,
    Group,
    Package,
    PackageIdentifierInput,
    PackageIssue,
    User
} from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { catalogEntityToGraphQL, getCatalogFromCacheOrDbByIdOrFail } from "./CatalogResolver";
import {
    collectionEntityToGraphQL,
    getCollectionFromCacheOrDbById,
    getCollectionFromCacheOrDbByIdOrFail
} from "./CollectionResolver";
import { getPackageFromCacheOrDbByIdOrFail, packageEntityToGraphqlObject } from "./PackageResolver";
import { versionEntityToGraphqlObject } from "./VersionResolver";
import { VersionEntity } from "../entity/VersionEntity";
import { getUserFromCacheOrDbByIdOrFail } from "./UserResolver";
import { ActivityLogRepository } from "../repository/ActivityLogRepository";
import { PackageEntity } from "../entity/PackageEntity";
import { CatalogEntity } from "../entity/CatalogEntity";
import { CollectionEntity } from "../entity/CollectionEntity";
import { GraphQLResolveInfo } from "graphql";

export const activtyLogEntityToGraphQL = async function (
    context: Context,
    connection: Connection | EntityManager,
    activityLogEntity: ActivityLogEntity
): Promise<ActivityLog> {
    const activityLog: ActivityLog = {
        id: activityLogEntity.id,
        eventType: activityLogEntity.eventType,
        changeType: activityLogEntity.changeType,
        createdAt: activityLogEntity.createdAt,
        updatedAt: activityLogEntity.updatedAt,
        propertiesEdited: activityLogEntity.propertiesEdited,
        permissions: activityLogEntity.permissions
    };

    if (activityLogEntity.userId) {
        if (activityLogEntity.user) activityLog.user = activityLogEntity.user;
        else {
            activityLog.user = await getUserFromCacheOrDbByIdOrFail(context, connection, activityLogEntity.userId);
        }
    }

    if (activityLogEntity.targetCatalogId) {
        if (activityLogEntity.targetCatalog)
            activityLog.targetCatalog = catalogEntityToGraphQL(activityLogEntity.targetCatalog);
        else {
            activityLog.targetCatalog = catalogEntityToGraphQL(
                await getCatalogFromCacheOrDbByIdOrFail(context, connection, activityLogEntity.targetCatalogId)
            );
        }
    }

    if (activityLogEntity.targetCollectionId) {
        if (activityLogEntity.targetCollection)
            activityLog.targetCollection = collectionEntityToGraphQL(activityLogEntity.targetCollection);
        else {
            activityLog.targetCollection = collectionEntityToGraphQL(
                await getCollectionFromCacheOrDbByIdOrFail(context, connection, activityLogEntity.targetCollectionId)
            );
        }
    }

    if (activityLogEntity.targetPackageId) {
        if (activityLogEntity.targetPackage)
            activityLog.targetPackage = await packageEntityToGraphqlObject(
                context,
                context.connection,
                activityLogEntity.targetPackage
            );
        else {
            activityLog.targetPackage = await packageEntityToGraphqlObject(
                context,
                context.connection,
                await getPackageFromCacheOrDbByIdOrFail(context, connection, activityLogEntity.targetPackageId)
            );
        }
    }

    if (activityLogEntity.targetPackageVersionId) {
        if (activityLogEntity.targetPackageVersion)
            activityLog.targetPackageVersion = await versionEntityToGraphqlObject(
                context,
                connection,
                activityLogEntity.targetPackageVersion
            );
        else {
            activityLog.targetPackageVersion = await versionEntityToGraphqlObject(
                context,
                connection,
                await connection.getRepository(VersionEntity).findOneOrFail(activityLogEntity.targetPackageVersionId)
            );
        }
    }

    return activityLog;
};

export const myActivity = async (
    _0: unknown,
    { filter }: { filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<ActivityLogResult> => {
    const ALIAS = "myActivities";
    const { eventType, limit, offset } = filter;

    let builder = context.connection
        .getRepository(ActivityLogEntity)
        .createQueryBuilder(ALIAS)
        .where({ userId: context?.me?.id });

    if (eventType != null && eventType?.length > 0) {
        builder = builder.andWhere('"myActivities"."event_type" IN (:...types)', { types: eventType });
    }
    const [logs, count] = await builder
        .addRelations(ALIAS, getRelationNames(graphqlFields(info).logs))
        .skip(offset)
        .take(limit)
        .getManyAndCount();

    const logObjects = await Promise.all(logs.map((l) => activtyLogEntityToGraphQL(context, context.connection, l)));

    return {
        logs: logObjects,
        count,
        hasMore: count - (limit + offset) > 0
    };
};

export const collectionActivities = async (
    _0: unknown,
    { identifier, filter }: { identifier: CollectionIdentifierInput; filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<ActivityLogResult> => {
    const ALIAS = "collectionActivities";
    const { limit, offset } = filter;

    const [logs, count] = await context.connection
        .getRepository(ActivityLogEntity)
        .createQueryBuilder(ALIAS)
        .where([
            {
                eventType: In([
                    ActivityLogEventType.COLLECTION_PACKAGE_ADDED,
                    ActivityLogEventType.COLLECTION_PACKAGE_REMOVED
                ])
            },
            {
                targetCollection: { identifier }
            }
        ])
        .addRelations(ALIAS, getRelationNames(graphqlFields(info).logs))
        .skip(offset)
        .take(limit)
        .getManyAndCount();

    const logObjects = await Promise.all(logs.map((l) => activtyLogEntityToGraphQL(context, context.connection, l)));

    return {
        logs: logObjects,
        count: count,
        hasMore: count - (limit + offset) > 0
    };
};

export const packageActivities = async (
    _0: unknown,
    { identifier, filter }: { identifier: PackageIdentifierInput; filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<ActivityLogResult> => {
    const ALIAS = "packageActivities";
    const { limit, offset } = filter;

    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier });

    let builder = context.connection.getRepository(ActivityLogEntity).createQueryBuilder(ALIAS).where({
        targetPackageId: packageEntity.id
    });

    if (filter.eventType) {
        builder = builder.andWhere('"packageActivities"."event_type" IN (:...eventTypes)', {
            eventTypes: filter.eventType
        });
    }

    const [logs, count] = await builder
        .addRelations(ALIAS, getRelationNames(graphqlFields(info).logs))
        .skip(offset)
        .take(limit)
        .getManyAndCount();

    const logObjects = await Promise.all(logs.map((l) => activtyLogEntityToGraphQL(context, context.connection, l)));

    return {
        logs: logObjects,
        count: count,
        hasMore: count - (limit + offset) > 0
    };
};

export const catalogActivities = async (
    _0: unknown,
    { identifier, filter }: { identifier: CollectionIdentifierInput; filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    _info: GraphQLResolveInfo
): Promise<ActivityLogResult> => {
    return {
        logs: [],
        count: 0,
        hasMore: false
    };
};

export const myFollowingActivity = async (
    _0: unknown,
    { offset, limit }: { offset: number; limit: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{
    logs: ActivityLog[];
    count: number;
    hasMore: boolean;
}> => {
    const relations = getRelationNames(graphqlFields(info).logs);
    const [logs, count] = await context.connection.manager
        .getCustomRepository(ActivityLogRepository)
        .getUserFollowingActivity(context.me.id, offset, limit, relations);

    const convertedLogs = await logs.asyncMap((l) => activtyLogEntityToGraphQL(context, context.connection, l));
    return {
        logs: convertedLogs,
        count,
        hasMore: count - (limit + offset) > 0
    };
};

export const logId = async (
    parent: ActivityLog,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<number> => {
    return parent.id;
};

export const logPropertiesEdited = async (
    parent: ActivityLog,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<string[] | null> => {
    return parent.propertiesEdited || null;
};

export const logAuthor = async (
    parent: ActivityLog,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<User | null> => {
    const log = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, false);
    return log.user;
};

export const logPackage = async (
    parent: ActivityLog,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Package | null> => {
    const cachedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, false, [
        "targetPackage"
    ]);
    if (!cachedLog.targetPackageId) {
        return null;
    }

    const targetPackageEntity = cachedLog.targetPackage;
    if (targetPackageEntity) {
        return packageEntityToGraphqlObject(context, context.connection, targetPackageEntity);
    }

    const loadedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, true, [
        "targetPackage"
    ]);
    return packageEntityToGraphqlObject(context, context.connection, loadedLog.targetPackage as PackageEntity);
};

export const logPackageIssue = async (
    parent: ActivityLog,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<PackageIssue | null> => {
    const cachedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, false, [
        "targetPackageIssue"
    ]);

    if (!cachedLog.targetPackageIssueId) {
        return null;
    }

    const targetPackageIssueEntity = cachedLog.targetPackageIssue;
    if (targetPackageIssueEntity) {
        return targetPackageIssueEntity;
    }

    const loadedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, true, [
        "targetPackageIssue"
    ]);
    return loadedLog.targetPackageIssue;
};

export const logCatalog = async (
    parent: ActivityLog,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Catalog | null> => {
    const cachedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, false, [
        "targetCatalog"
    ]);
    if (!cachedLog.targetCatalogId) {
        return null;
    }

    const targetCatalogEntity = cachedLog.targetCatalog;
    if (targetCatalogEntity) {
        return catalogEntityToGraphQL(targetCatalogEntity);
    }

    const loadedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, true, [
        "targetCatalog"
    ]);
    return catalogEntityToGraphQL(loadedLog.targetCatalog as CatalogEntity);
};

export const logCollection = async (
    parent: ActivityLog,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Collection | null> => {
    const cachedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, false, [
        "targetCollection"
    ]);
    if (!cachedLog.targetCollectionId) {
        return null;
    }

    const targetCollectionEntity = cachedLog.targetCollection;
    if (targetCollectionEntity) {
        return collectionEntityToGraphQL(targetCollectionEntity);
    }

    const loadedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, true, [
        "targetCollection"
    ]);
    return collectionEntityToGraphQL(loadedLog.targetCollection as CollectionEntity);
};

export const logUser = async (
    parent: ActivityLog,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<User | null> => {
    const cachedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, false, [
        "targetUser"
    ]);
    if (!cachedLog.targetUserId) {
        return null;
    }

    const targetUserEntity = cachedLog.targetUser;
    if (targetUserEntity) {
        return targetUserEntity;
    }

    const loadedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, true, [
        "targetUser"
    ]);
    return loadedLog.targetUser;
};

export const logGroup = async (
    parent: ActivityLog,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<Group | null> => {
    const cachedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, false, [
        "targetGroup"
    ]);
    if (!cachedLog.targetGroupId) {
        return null;
    }

    const targetGroupEntity = cachedLog.targetGroup;
    if (targetGroupEntity) {
        return targetGroupEntity;
    }

    const loadedLog = await getActivityLogFromCacheOrDbByIdOrFail(context, context.connection, parent.id, true, [
        "targetGroup"
    ]);
    return loadedLog.targetGroup;
};

export const getActivityLogFromCacheOrDbByIdOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    logId: number,
    forceReload?: boolean,
    relations: string[] = []
): Promise<ActivityLogEntity> => {
    if (!relations.includes("user")) {
        relations.push("user");
    }

    const logPromiseFunction = () =>
        connection.getCustomRepository(ActivityLogRepository).findOneOrFail({ id: logId }, { relations });
    const activityLog = await context.cache.loadActivityLog(logId, logPromiseFunction, forceReload);

    if (!activityLog) {
        throw new Error("ACTIVITY_LOG_NOT_FOUND");
    }

    return activityLog;
};
