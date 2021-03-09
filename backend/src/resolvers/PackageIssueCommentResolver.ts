import { AuthenticatedContext } from "../context";
import { IssueCommentEntity } from "../entity/IssueCommentEntity";
import {
    CreatePackageIssueCommentInput,
    PackageIdentifierInput,
    PackageIssueComment,
    PackageIssueIdentifierInput
} from "../generated/graphql";
import { OrderBy } from "../repository/OrderBy";
import { PackageIssueCommentRepository } from "../repository/PackageIssueCommentRepository";
import { PackageIssueRepository } from "../repository/PackageIssueRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { getGraphQlRelationName } from "../util/relationNames";

export const getCommentsByByPackageIssue = async (
    _0: any,
    {
        packageIdentifier,
        issueIdentifier,
        offset,
        limit,
        orderBy
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        offset: number;
        limit: number;
        orderBy: OrderBy;
    },
    context: AuthenticatedContext,
    info: any
) => {
    console.log("info", info);
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);

    const relations = getGraphQlRelationName(info);
    console.log("relacionet", relations);

    const [comments, count] = await context.connection.manager
        .getCustomRepository(PackageIssueCommentRepository)
        .getCommentsByIssue(issueEntity.id, offset, limit, orderBy, relations);

    return {
        comments,
        hasMore: count - (offset + limit) > 0,
        count
    };
};

export const getPackageIssueCommentAuthor = async (parent: any, _1: any, context: AuthenticatedContext, info: any) => {
    return await context.connection.getCustomRepository(UserRepository).findOneOrFail({
        where: { id: parent.authorId },
        relations: getGraphQlRelationName(info)
    });
};

export const createPackageIssueComment = async (
    _0: any,
    {
        packageIdentifier,
        issueIdentifier,
        comment
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        comment: CreatePackageIssueCommentInput;
    },
    context: AuthenticatedContext,
    info: any
) => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);

    const commentRepository = context.connection.manager.getCustomRepository(PackageIssueCommentRepository);
    const lastCommentCreatedForIssue = await commentRepository.getLastCreatedCommentForIssue(issueEntity.id);
    const commentId = lastCommentCreatedForIssue ? lastCommentCreatedForIssue.commentId + 1 : 0;

    const issueCommentEntity = new IssueCommentEntity();
    issueCommentEntity.issueId = issueEntity.id;
    issueCommentEntity.commentId = commentId;
    issueCommentEntity.authorId = context.me.id;
    issueCommentEntity.content = comment.content;

    return await commentRepository.save(issueCommentEntity);
};
