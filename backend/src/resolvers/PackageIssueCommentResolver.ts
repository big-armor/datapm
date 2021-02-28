import { AuthenticatedContext } from "../context";
import { IssueCommentEntity } from "../entity/IssueCommentEntity";
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
        offset,
        limit,
        orderBy
    }: { issueIdentifier: PackageIssueIdentifierInput; offset: number; limit: number; orderBy: OrderBy },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);

    const [comments, count] = await context.connection.manager
        .getCustomRepository(PackageIssueCommentRepository)
        .getCommentsByIssue(issueIdentifier.issueId, offset, limit, orderBy, relations);

    return {
        comments,
        hasMore: count - (offset + limit) > 0,
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
