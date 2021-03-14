import { AuthenticatedContext, Context } from "../context";
import { resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { PackageIssueEntity } from "../entity/PackageIssueEntity";
import { PackageIssueStatus } from "../entity/PackageIssueStatus";
import {
    CreatePackageIssueInput,
    PackageIdentifierInput,
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

export const getPackageIssue = async (
    _0: any,
    {
        packageIdentifier,
        packageIssueIdentifier
    }: {
        packageIdentifier: PackageIdentifierInput;
        packageIssueIdentifier: PackageIssueIdentifierInput;
    },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);

    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issue = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, packageIssueIdentifier.issueNumber, relations);

    if (!issue) {
        throw new Error("ISSUE_NOT_FOUND");
    }

    return issue;
};

export const deletePackageIssue = async (
    _0: any,
    {
        packageIdentifier,
        packageIssueIdentifier
    }: {
        packageIdentifier: PackageIdentifierInput;
        packageIssueIdentifier: PackageIssueIdentifierInput;
    },
    context: AuthenticatedContext,
    info: any
) => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const repository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    const issue = await repository.getByIssueNumberForPackage(packageEntity.id, packageIssueIdentifier.issueNumber);
    if (!issue) {
        throw new Error("ISSUE_NOT_FOUND");
    }

    await validatePermissionsToEditIssue(issue, packageIdentifier, context);

    await repository.delete(issue.id);
};

export const getIssuesByPackage = async (
    _0: any,
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
    info: any
) => {
    const relations = getGraphQlRelationName(info);

    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const [issues, count] = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getIssuesByPackage(
            packageEntity.id,
            includeOpenIssues,
            includeClosedIssues,
            offset,
            limit,
            orderBy,
            relations
        );

    return {
        issues,
        hasMore: count - (offset + limit) > 0,
        count
    };
};

export const getPackageIssueAuthor = async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
    return await context.connection.getCustomRepository(UserRepository).findOneOrFail({
        where: { id: parent.authorId },
        relations: getGraphQlRelationName(info)
    });
};

export const createPackageIssue = async (
    _0: any,
    { packageIdentifier, issue }: { packageIdentifier: PackageIdentifierInput; issue: CreatePackageIssueInput },
    context: AuthenticatedContext,
    info: any
) => {
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

    return await issueRepository.save(issueEntity);
};

export const updatePackageIssue = async (
    _0: any,
    {
        packageIdentifier,
        issueIdentifier,
        issue
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        issue: UpdatePackageIssueInput;
    },
    context: AuthenticatedContext,
    info: any
) => {
    const issueEntity = await getIssueEntity(context, packageIdentifier, issueIdentifier);
    await validatePermissionsToEditIssue(issueEntity, packageIdentifier, context);

    issueEntity.subject = issue.subject;
    issueEntity.content = issue.content;

    const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    return await issueRepository.save(issueEntity);
};

export const updatePackageIssueStatus = async (
    _0: any,
    {
        packageIdentifier,
        issueIdentifier,
        status
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        status: UpdatePackageIssueStatusInput;
    },
    context: AuthenticatedContext,
    info: any
) => {
    const issueEntity = await getIssueEntity(context, packageIdentifier, issueIdentifier);
    await validatePermissionsToEditIssue(issueEntity, packageIdentifier, context);

    issueEntity.status = status.status;

    const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    return await issueRepository.save(issueEntity);
};

export const updatePackageIssuesStatuses = async (
    _0: any,
    {
        packageIdentifier,
        issuesIdentifiers,
        status
    }: {
        packageIdentifier: PackageIdentifierInput;
        issuesIdentifiers: PackageIssueIdentifierInput[];
        status: UpdatePackageIssueStatusInput;
    },
    context: AuthenticatedContext,
    info: any
) => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    const issuesNumbers = issuesIdentifiers.map((i) => i.issueNumber);
    const issues = await issueRepository.getIssuesByPackageAndIssueNumbers(packageEntity.id, issuesNumbers);

    await validateEditPermissionsForIssues(issues, packageIdentifier, context);

    issues.forEach((i) => (i.status = status.status));

    await issueRepository.save(issues);
};

export const deletePackageIssues = async (
    _0: any,
    {
        packageIdentifier,
        issuesIdentifiers
    }: {
        packageIdentifier: PackageIdentifierInput;
        issuesIdentifiers: PackageIssueIdentifierInput[];
    },
    context: AuthenticatedContext,
    info: any
) => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    const issuesNumbers = issuesIdentifiers.map((i) => i.issueNumber);
    const issues = await issueRepository.getIssuesByPackageAndIssueNumbers(packageEntity.id, issuesNumbers);

    await validateEditPermissionsForIssues(issues, packageIdentifier, context);

    const issuesIds = issues.map((i) => i.id);
    await issueRepository.delete(issuesIds);
};

async function getIssueEntity(
    context: any,
    packageIdentifier: PackageIdentifierInput,
    issueIdentifier: PackageIssueIdentifierInput
) {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueRepository = context.connection.manager.getCustomRepository(PackageIssueRepository);
    return await issueRepository.getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);
}

async function validatePermissionsToEditIssue(
    issueEntity: PackageIssueEntity,
    packageIdentifier: PackageIdentifierInput,
    context: Context
): Promise<void> {
    if (!context.me) {
        throw new Error("NOT_AUTHORIZED");
    }

    const packagePermissions = await resolvePackagePermissions(context, packageIdentifier, context.me);
    validateEditPermissionsForIssue(issueEntity, packagePermissions, context);
}

async function validateEditPermissionsForIssues(
    issues: PackageIssueEntity[],
    packageIdentifier: PackageIdentifierInput,
    context: Context
): Promise<void> {
    if (!context.me) {
        throw new Error("NOT_AUTHORIZED");
    }

    const packagePermissions = await resolvePackagePermissions(context, packageIdentifier, context.me);
    validatePermissionsToEditIssues(issues, packagePermissions, context);
}

async function validatePermissionsToEditIssues(
    issues: PackageIssueEntity[],
    packagePermissions: Permission[],
    context: Context
): Promise<void> {
    if (!context.me) {
        throw new Error("NOT_AUTHORIZED");
    }

    issues.forEach((i) => validateEditPermissionsForIssue(i, packagePermissions, context));
}

async function validateEditPermissionsForIssue(
    issueEntity: PackageIssueEntity,
    packagePermissions: Permission[],
    context: Context
): Promise<void> {
    if (!context.me) {
        throw new Error("NOT_AUTHORIZED");
    }

    if (issueEntity.authorId !== context.me.id && packagePermissions.includes(Permission.MANAGE)) {
        throw new Error("NOT_AUTHORIZED");
    }
}
