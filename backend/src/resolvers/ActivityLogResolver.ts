import { In } from "typeorm";
import graphqlFields from "graphql-fields";

import { AuthenticatedContext } from "../context";
import { ActivityLog } from "../entity/ActivityLog";
import { getRelationNames } from "../util/relationNames";
import {
    ActivityLogEventType,
    ActivityLogFilterInput,
    ActivityLogResult,
    CollectionIdentifierInput,
    PackageIdentifierInput
} from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";

export const myActivity = async (
    _0: any,
    { filter }: { filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    info: any
): Promise<ActivityLogResult> => {
    const ALIAS = "myActivities";
    const { eventType, limit, offset } = filter;

    let builder = context.connection
        .getRepository(ActivityLog)
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

    return {
        logs,
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
        .getRepository(ActivityLog)
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

    return {
        logs,
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

    let builder = context.connection.getRepository(ActivityLog).createQueryBuilder(ALIAS).where({
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

    return {
        logs,
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
