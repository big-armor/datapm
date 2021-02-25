import { AuthenticatedContext } from "../context";
import { IssueCommentEntity } from "../entity/IssueCommentEntity";
import { PackageIssueEntity } from "../entity/PackageIssueEntity";
import { PackageIssueStatus } from "../entity/PackageIssueStatus";
import { CreatePackageIssueCommentInput, PackageIssueIdentifierInput } from "../generated/graphql";
import { OrderBy } from "../repository/OrderBy";
import { PackageIssueCommentRepository } from "../repository/PackageIssueCommentRepository";
import { PackageIssueRepository } from "../repository/PackageIssueRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { getGraphQlRelationName } from "../util/relationNames";

export const getCommentsByByPackageIssue = async (
    _0: any,
    {
        issueIdentifier,
        limit,
        offSet,
        orderBy
    }: { issueIdentifier: PackageIssueIdentifierInput; limit: number; offSet: number; orderBy: OrderBy },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);

    const [issues, count] = await context.connection.manager
        .getCustomRepository(PackageIssueCommentRepository)
        .getCommentsByIssue(issueIdentifier.issueId, limit, offSet, orderBy, relations);

    return {
        hasMore: count - (offSet + limit) > 0,
        packages: issues,
        count
    };
};

export const createPackageIssueComment = async (
    _0: any,
    { identifier, comment }: { identifier: PackageIssueIdentifierInput; comment: CreatePackageIssueCommentInput },
    context: AuthenticatedContext,
    info: any
) => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: identifier.package });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueIdForPackage(packageEntity.id, identifier.issueId);

    const commentRepository = context.connection.manager.getCustomRepository(PackageIssueCommentRepository);
    const lastCommentCreatedForIssue = await commentRepository.getLastCreatedCommentForIssue(issueEntity.issueId);
    const commentId = lastCommentCreatedForIssue ? lastCommentCreatedForIssue.commentId + 1 : 0;

    const issueCommentEntity = new IssueCommentEntity();
    issueCommentEntity.issueId = issueEntity.issueId;
    issueCommentEntity.commentId = commentId;
    issueCommentEntity.creatorId = context.me.id;
    issueCommentEntity.content = comment.content;

    return await commentRepository.save(issueCommentEntity);
};
