import { In } from "typeorm";
import graphqlFields from "graphql-fields";

import { AuthenticatedContext } from "../context";
import { ActivityLog } from "../entity/ActivityLog";
import { getRelationNames } from "../util/relationNames";
import {
    ActivityLogEventType,
    ActivityLogFilterInput,
    ActivityLogResult,
    CollectionIdentifierInput
} from "../generated/graphql";

export const myActivity = async (
    _0: any,
    { filter }: { filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    info: any
): Promise<ActivityLogResult> => {
    const ALIAS = "myActivities";
    const { eventType, limit, offset } = filter;

    const [logs, count] = await context.connection
        .getRepository(ActivityLog)
        .createQueryBuilder(ALIAS)
        .where({ userId: context?.me?.id }, { eventType })
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
    { identifier, filter }: { identifier: CollectionIdentifierInput; filter: ActivityLogFilterInput },
    context: AuthenticatedContext,
    info: any
): Promise<ActivityLogResult> => {
    const ALIAS = "packageActivities";
    const { limit, offset } = filter;

    const [logs, count] = await context.connection
        .getRepository(ActivityLog)
        .createQueryBuilder()
        .where([
            {
                eventType: In([
                    ActivityLogEventType.PACKAGE_CREATED,
                    ActivityLogEventType.PACKAGE_DELETED,
                    ActivityLogEventType.PACKAGE_FETCHED,
                    ActivityLogEventType.PACKAGE_MAJOR_CHANGE,
                    ActivityLogEventType.PACKAGE_MINOR_CHANGE,
                    ActivityLogEventType.PACKAGE_PATCH_CHANGE,
                    ActivityLogEventType.PACKAGE_VIEWED
                ])
            },
            {
                targetPackage: { collectionIdentifier: identifier }
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
