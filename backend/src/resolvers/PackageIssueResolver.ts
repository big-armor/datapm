import { AuthenticatedContext, Context } from "../context";
import { resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { PackageIssueEntity } from "../entity/PackageIssueEntity";
import { PackageIssueStatus } from "../entity/PackageIssueStatus";
import {
    ActivityLogChangeType,
    ActivityLogEventType,
    CreatePackageIssueInput,
    PackageIdentifierInput,
    PackageIssue,
    PackageIssueIdentifierInput,
    Permission,
    UpdatePackageIssueInput,
    UpdatePackageIssueStatusInput
} from "../generated/graphql";
import { OrderBy } from "../repository/OrderBy";
import { PackageIssueRepository } from "../repository/PackageIssueRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { getGraphQlRelationName } from "../util/relationNames";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { PackageEntity } from "../entity/PackageEntity";
import { Connection, EntityManager } from "typeorm";
import { isAuthenticatedContext } from "../util/contextHelpers";
import { GraphQLResolveInfo } from "graphql";
import { PackageIssuesResult, User } from "datapm-client-lib";

export const getPackageIssue = async (
    _0: unknown,
    {
        packageIdentifier,
        packageIssueIdentifier
    }: {
        packageIdentifier: PackageIdentifierInput;
        packageIssueIdentifier: PackageIssueIdentifierInput;
    },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<PackageIssue> => {
    const relations = getGraphQlRelationName(info);
    return await getPackageIssueByIdentifiers(context.connection, packageIdentifier, packageIssueIdentifier, relations);
};

export const getPackageIssueByIdentifiers = async (
    connection: EntityManager | Connection,
    packageIdentifier: PackageIdentifierInput,
    packageIssueIdentifier: PackageIssueIdentifierInput,
    relations: string[] = []
): Promise<PackageIssueEntity> => {
    const packageEntity = await connection
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issue = await connection
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, packageIssueIdentifier.issueNumber, relations);

    if (!issue) {
        throw new Error("ISSUE_NOT_FOUND");
    }

    return issue;
};

export const deletePackageIssue = async (
    _0: unknown,
    {
        packageIdentifier,
        packageIssueIdentifier
    }: {
        packageIdentifier: PackageIdentifierInput;
        packageIssueIdentifier: PackageIssueIdentifierInput;
    },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const repository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    const issue = await repository.getByIssueNumberForPackage(packageEntity.id, packageIssueIdentifier.issueNumber);
    if (!issue) {
        throw new Error("ISSUE_NOT_FOUND");
    }

    const canDeleteIssue = await hasPermissionsToEditIssue(issue, packageIdentifier, context);
    if (!canDeleteIssue) {
        throwNotAuthorizedError();
    }

    await repository.delete(issue.id);
};

export const getIssuesByPackage = async (
    _0: unknown,
    {
        packageIdentifier,
        includeOpenIssues,
        includeClosedIssues,
        offset,
        limit,
        orderBy
    }: {
        packageIdentifier: PackageIdentifierInput;
        includeOpenIssues: boolean;
        includeClosedIssues: boolean;
        offset: number;
        limit: number;
        orderBy: OrderBy;
    },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<PackageIssuesResult> => {
    const relations = getGraphQlRelationName(info);

    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const repository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    const [issues, count] = await repository.getIssuesByPackage(
        packageEntity.id,
        includeOpenIssues,
        includeClosedIssues,
        offset,
        limit,
        orderBy,
        relations
    );

    const counts = (await repository.countIssuesByPackage(packageEntity.id))[0];

    return {
        issues,
        hasMore: count - (offset + limit) > 0,
        count,
        openIssuesCount: counts.open_issues_count,
        closedIssuesCount: counts.closed_issues_count
    };
};

export const getPackageIssueAuthor = async (
    parent: PackageIssue,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<User> => {
    return await context.connection.getCustomRepository(UserRepository).findOneOrFail({
        where: { id: (parent as PackageIssueEntity).authorId },
        relations: getGraphQlRelationName(info)
    });
};

export const getPackageIssuePackageIdentifier = async (
    parent: PackageIssue,
    _1: unknown,
    context: AuthenticatedContext
): Promise<PackageIdentifierInput | null> => {
    if (!(parent as PackageIssueEntity).packageId) {
        return null;
    }

    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackageByIdOrFail({ packageId: (parent as PackageIssueEntity).packageId, relations: ["catalog"] });

    return {
        catalogSlug: packageEntity.catalog.slug,
        packageSlug: packageEntity.slug
    };
};

export const createPackageIssue = async (
    _0: unknown,
    { packageIdentifier, issue }: { packageIdentifier: PackageIdentifierInput; issue: CreatePackageIssueInput },
    context: AuthenticatedContext
): Promise<PackageIssue> => {
    if (!context.me) {
        throwNotAuthorizedError();
    }
    return await context.connection.transaction(async (transaction) => {
        const packageEntity = await context.connection.manager
            .getCustomRepository(PackageRepository)
            .findPackageOrFail({ identifier: packageIdentifier });

        const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
        const lastIssueCreatedForPackage = await issueRepository.getLastCreatedIssueForPackage(packageEntity.id);
        const issueNumber = lastIssueCreatedForPackage ? lastIssueCreatedForPackage.issueNumber + 1 : 0;

        const issueEntity = new PackageIssueEntity();
        issueEntity.issueNumber = issueNumber;
        issueEntity.packageId = packageEntity.id;
        issueEntity.authorId = context.me.id;
        issueEntity.subject = issue.subject;
        issueEntity.content = issue.content;
        issueEntity.status = PackageIssueStatus.OPEN;

        const savedIssueEntity = await issueRepository.save(issueEntity);

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.PACKAGE_ISSUE_CREATED,
            targetPackageIssueId: savedIssueEntity.id,
            targetPackageId: packageEntity.id
        });

        return savedIssueEntity;
    });
};

export const updatePackageIssue = async (
    _0: unknown,
    {
        packageIdentifier,
        issueIdentifier,
        issue
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        issue: UpdatePackageIssueInput;
    },
    context: AuthenticatedContext
): Promise<PackageIssue> => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });
    const issueEntity = await getIssueEntityWithPackage(context, packageEntity, issueIdentifier);

    const canEditIssue = await hasPermissionsToEditIssue(issueEntity, packageIdentifier, context);
    if (!canEditIssue) {
        throwNotAuthorizedError();
    }

    return await context.connection.transaction(async (transaction) => {
        issueEntity.subject = issue.subject;
        issueEntity.content = issue.content;

        const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
        const savedIssueEntity = await issueRepository.save(issueEntity);

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.PACKAGE_ISSUE_EDIT,
            targetPackageIssueId: savedIssueEntity.id,
            targetPackageId: packageEntity.id
        });

        return savedIssueEntity;
    });
};

export const updatePackageIssueStatus = async (
    _0: unknown,
    {
        packageIdentifier,
        issueIdentifier,
        status
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        status: UpdatePackageIssueStatusInput;
    },
    context: AuthenticatedContext
): Promise<PackageIssueEntity> => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });
    const issueEntity = await getIssueEntityWithPackage(context, packageEntity, issueIdentifier);

    const canEditIssue = await hasPermissionsToEditIssue(issueEntity, packageIdentifier, context);
    if (!canEditIssue) {
        throwNotAuthorizedError();
    }

    return await context.connection.transaction(async (transaction) => {
        issueEntity.status = status.status;

        const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
        const savedIssueEntity = await issueRepository.save(issueEntity);

        if (PackageIssueStatus.CLOSED === status.status) {
            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.PACKAGE_ISSUE_STATUS_CHANGE,
                changeType: ActivityLogChangeType.CLOSED,
                targetPackageIssueId: savedIssueEntity.id,
                targetPackageId: packageEntity.id
            });
        }

        return savedIssueEntity;
    });
};

export const updatePackageIssuesStatuses = async (
    _0: unknown,
    {
        packageIdentifier,
        issuesIdentifiers,
        status
    }: {
        packageIdentifier: PackageIdentifierInput;
        issuesIdentifiers: PackageIssueIdentifierInput[];
        status: UpdatePackageIssueStatusInput;
    },
    context: AuthenticatedContext
): Promise<void> => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    const issuesNumbers = issuesIdentifiers.map((i) => i.issueNumber);
    const issues = await issueRepository.getIssuesByPackageAndIssueNumbers(packageEntity.id, issuesNumbers);

    const canEditIssues = await hasEditPermissionsForIssues(issues, packageIdentifier, context);
    if (!canEditIssues) {
        throwNotAuthorizedError();
    }

    const isClosingIssues = PackageIssueStatus.CLOSED === status.status;
    await context.connection.transaction(async (transaction) => {
        issues.forEach(async (issue) => (issue.status = status.status));

        if (isClosingIssues) {
            const logsPromises = issues.map((issue) =>
                createActivityLog(transaction, {
                    userId: context.me.id,
                    eventType: ActivityLogEventType.PACKAGE_ISSUE_STATUS_CHANGE,
                    changeType: ActivityLogChangeType.CLOSED,
                    targetPackageIssueId: issue.id,
                    targetPackageId: packageEntity.id
                })
            );
            await Promise.all(logsPromises);
        }

        await issueRepository.save(issues);
    });
};

export const deletePackageIssues = async (
    _0: unknown,
    {
        packageIdentifier,
        issuesIdentifiers
    }: {
        packageIdentifier: PackageIdentifierInput;
        issuesIdentifiers: PackageIssueIdentifierInput[];
    },
    context: AuthenticatedContext
): Promise<void> => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    const issuesNumbers = issuesIdentifiers.map((i) => i.issueNumber);
    const issues = await issueRepository.getIssuesByPackageAndIssueNumbers(packageEntity.id, issuesNumbers);

    const canEditIssues = await hasEditPermissionsForIssues(issues, packageIdentifier, context);
    if (!canEditIssues) {
        throwNotAuthorizedError();
    }

    const issuesIds = issues.map((i) => i.id);

    await context.connection.transaction(async (transaction) => {
        await issueRepository.delete(issuesIds);

        const logsPromises = issuesIds.map((issueId) => {
            const issue = issues.find((i) => i.id === issueId);
            return createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.PACKAGE_ISSUE_DELETED,
                removedItemId: issueId,
                removedItemName: issue?.subject,
                targetPackageId: packageEntity.id
            });
        });

        await Promise.all(logsPromises);
    });
};

async function getIssueEntityWithPackage(
    context: Context,
    packageEntity: PackageEntity,
    issueIdentifier: PackageIssueIdentifierInput
) {
    const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    return await issueRepository.getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);
}

async function hasPermissionsToEditIssue(
    issueEntity: PackageIssueEntity,
    packageIdentifier: PackageIdentifierInput,
    context: Context
): Promise<boolean> {
    if (!isAuthenticatedContext(context)) {
        return false;
    }

    const authenicatedContext = context as AuthenticatedContext;

    const packagePermissions = await resolvePackagePermissions(context, packageIdentifier, authenicatedContext.me);
    return canEditIssue(issueEntity, packagePermissions, context);
}

async function hasEditPermissionsForIssues(
    issues: PackageIssueEntity[],
    packageIdentifier: PackageIdentifierInput,
    context: Context
): Promise<boolean> {
    if (!isAuthenticatedContext(context)) {
        return false;
    }

    const authenicatedContext = context as AuthenticatedContext;

    const packagePermissions = await resolvePackagePermissions(context, packageIdentifier, authenicatedContext.me);
    return hasPermissionsToEditIssues(issues, packagePermissions, context);
}

function hasPermissionsToEditIssues(
    issues: PackageIssueEntity[],
    packagePermissions: Permission[],
    context: Context
): boolean {
    return issues.every((i) => canEditIssue(i, packagePermissions, context));
}

function canEditIssue(issueEntity: PackageIssueEntity, packagePermissions: Permission[], context: Context): boolean {
    if (!isAuthenticatedContext(context)) {
        return false;
    }

    const authenicatedContext = context as AuthenticatedContext;

    if (packagePermissions.includes(Permission.MANAGE)) {
        return true;
    }

    return issueEntity.authorId === authenicatedContext.me.id;
}

function throwNotAuthorizedError() {
    throw new Error("NOT_AUTHORIZED");
}
