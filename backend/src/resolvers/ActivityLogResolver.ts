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
    CollectionIdentifierInput,
    PackageIdentifierInput
} from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { UserEntity } from "../entity/UserEntity";
import { catalogEntityToGraphQL } from "./CatalogResolver";
import { CatalogEntity } from "../entity/CatalogEntity";
import { collectionEntityToGraphQL } from "./CollectionResolver";
import { CollectionEntity } from "../entity/CollectionEntity";
import { packageEntityToGraphqlObject } from "./PackageResolver";
import { PackageEntity } from "../entity/PackageEntity";
import { versionEntityToGraphqlObject } from "./VersionResolver";
import { VersionEntity } from "../entity/VersionEntity";

export const activtyLogEntityToGraphQL = async function (
    context: Context,
    connection: Connection | EntityManager,
    activityLogEntity: ActivityLogEntity
): Promise<ActivityLog> {
    const activityLog: ActivityLog = {
        eventType: activityLogEntity.eventType,
        changeType: activityLogEntity.changeType,
        createdAt: activityLogEntity.createdAt,
        updatedAt: activityLogEntity.updatedAt,
        propertiesEdited: activityLogEntity.propertiesEdited
    };

    if (activityLogEntity.userId) {
        if (activityLogEntity.user) activityLog.user = activityLogEntity.user;
        else {
            activityLog.user = await connection.getRepository(UserEntity).findOneOrFail(activityLogEntity.userId);
        }
    }

    if (activityLogEntity.targetCatalogId) {
        if (activityLogEntity.targetCatalog)
            activityLog.targetCatalog = catalogEntityToGraphQL(activityLogEntity.targetCatalog);
        else {
            activityLog.targetCatalog = catalogEntityToGraphQL(
                await connection.getRepository(CatalogEntity).findOneOrFail(activityLogEntity.targetCatalogId)
            );
        }
    }

    if (activityLogEntity.targetCollectionId) {
        if (activityLogEntity.targetCollection)
            activityLog.targetCollection = collectionEntityToGraphQL(activityLogEntity.targetCollection);
        else {
            activityLog.targetCollection = collectionEntityToGraphQL(
                await connection.getRepository(CollectionEntity).findOneOrFail(activityLogEntity.targetCollectionId)
            );
        }
    }

    if (activityLogEntity.targetPackageId) {
        if (activityLogEntity.targetPackage)
            activityLog.targetPackage = await packageEntityToGraphqlObject(context, activityLogEntity.targetPackage);
        else {
            activityLog.targetPackage = await packageEntityToGraphqlObject(
                context,
                await connection.getRepository(PackageEntity).findOneOrFail(activityLogEntity.targetPackageId)
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
    _0: any,
    { filter }: { filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    info: any
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
    _0: any,
    { identifier, filter }: { identifier: CollectionIdentifierInput; filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    info: any
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
    _0: any,
    { identifier, filter }: { identifier: PackageIdentifierInput; filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    info: any
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
    _0: any,
    { identifier, filter }: { identifier: CollectionIdentifierInput; filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    _info: any
): Promise<ActivityLogResult> => {
    return {
        logs: [],
        count: 0,
        hasMore: false
    };
};
