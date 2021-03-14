import { AuthenticatedContext, Context } from "../context";
import { resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { IssueCommentEntity } from "../entity/IssueCommentEntity";
import {
    CreatePackageIssueCommentInput,
    PackageIdentifierInput,
    PackageIssueCommentIdentifierInput,
    PackageIssueIdentifierInput,
    Permission,
    UpdatePackageIssueCommentInput
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
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);

    const relations = getGraphQlRelationName(info);

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

export const updatePackageIssueComment = async (
    _0: any,
    {
        packageIdentifier,
        issueIdentifier,
        issueCommentIdentifier,
        comment
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        issueCommentIdentifier: PackageIssueCommentIdentifierInput;
        comment: UpdatePackageIssueCommentInput;
    },
    context: AuthenticatedContext,
    info: any
) => {
    const commentRepository = context.connection.manager.getCustomRepository(PackageIssueCommentRepository);
    const commentEntity = await getCommentOrFail(context, packageIdentifier, issueIdentifier, issueCommentIdentifier);

    await validatePermissionsToEditComment(commentEntity, packageIdentifier, context);

    commentEntity.content = comment.content;
    return await commentRepository.save(commentEntity);
};

export const deletePackageIssueComment = async (
    _0: any,
    {
        packageIdentifier,
        issueIdentifier,
        issueCommentIdentifier
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        issueCommentIdentifier: PackageIssueCommentIdentifierInput;
    },
    context: AuthenticatedContext,
    info: any
) => {
    const commentRepository = context.connection.manager.getCustomRepository(PackageIssueCommentRepository);
    const commentEntity = await getCommentOrFail(context, packageIdentifier, issueIdentifier, issueCommentIdentifier);

    await validatePermissionsToEditComment(commentEntity, packageIdentifier, context);

    await commentRepository.delete(commentEntity.id);
};

async function getCommentOrFail(
    context: any,
    packageIdentifier: PackageIdentifierInput,
    issueIdentifier: PackageIssueIdentifierInput,
    issueCommentIdentifier: PackageIssueCommentIdentifierInput
) {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);

    const commentRepository = context.connection.manager.getCustomRepository(PackageIssueCommentRepository);
    const commentEntity = await commentRepository.getCommentByIssueIdAndCommentNumber(
        issueEntity.id,
        issueCommentIdentifier.commentNumber
    );

    if (!commentEntity) {
        throw new Error("COMMENT_NOT_FOUND");
    }

    await validatePermissionsToEditComment(commentEntity, packageIdentifier, context);

    return commentEntity;
}

async function validatePermissionsToEditComment(
    commentEntity: IssueCommentEntity,
    packageIdentifier: PackageIdentifierInput,
    context: Context
): Promise<void> {
    if (!context.me) {
        throw new Error("NOT_AUTHORIZED");
    }

    const packagePermissions = await resolvePackagePermissions(context, packageIdentifier, context.me);
    validateEditPermissionsForComment(commentEntity, packagePermissions, context);
}

async function validateEditPermissionsForComment(
    commentEntity: IssueCommentEntity,
    packagePermissions: Permission[],
    context: Context
): Promise<void> {
    if (!context.me) {
        throw new Error("NOT_AUTHORIZED");
    }

    if (commentEntity.authorId !== context.me.id && packagePermissions.includes(Permission.MANAGE)) {
        throw new Error("NOT_AUTHORIZED");
    }
}
