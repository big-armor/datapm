import { AuthenticatedContext } from "../context";
import { PackageIssueEntity } from "../entity/PackageIssueEntity";
import { PackageIssueStatus } from "../entity/PackageIssueStatus";
import {
    CreatePackageIssueInput,
    PackageIdentifierInput,
    PackageIssue,
    PackageIssueIdentifierInput
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
