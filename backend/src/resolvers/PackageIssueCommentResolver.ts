import { AuthenticatedContext, Context } from "../context";
import { resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { IssueCommentEntity } from "../entity/IssueCommentEntity";
import {
    ActivityLogEventType,
    CreatePackageIssueCommentInput,
    PackageIdentifierInput,
    PackageIssueCommentIdentifierInput,
    PackageIssueCommentsResult,
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
import { createActivityLog } from "../repository/ActivityLogRepository";
import { PackageIssueEntity } from "../entity/PackageIssueEntity";
import { isAuthenticatedContext } from "../util/contextHelpers";
import { GraphQLResolveInfo } from "graphql";
import { UserEntity } from "../entity/UserEntity";
import { PackageIssueComment, User } from "datapm-client-lib";

export const getCommentsByByPackageIssue = async (
    _0: unknown,
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
    info: GraphQLResolveInfo
): Promise<PackageIssueCommentsResult> => {
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

export const getPackageIssueCommentAuthor = async (
    parent: PackageIssueComment,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<User> => {
    return await context.connection.getCustomRepository(UserRepository).findOneOrFail({
        where: { id: (parent as IssueCommentEntity).authorId },
        relations: getGraphQlRelationName(info)
    });
};

export const createPackageIssueComment = async (
    _0: unknown,
    {
        packageIdentifier,
        issueIdentifier,
        comment
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        comment: CreatePackageIssueCommentInput;
    },
    context: AuthenticatedContext
): Promise<IssueCommentEntity> => {
    if (!context.me) {
        throwNotAuthorizedError();
    }

    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);

    const commentRepository = context.connection.manager.getCustomRepository(PackageIssueCommentRepository);
    const lastCommentCreatedForIssue = await commentRepository.getLastCreatedCommentForIssue(issueEntity.id);
    const commentNumber = lastCommentCreatedForIssue ? lastCommentCreatedForIssue.commentNumber + 1 : 0;

    const issueCommentEntity = new IssueCommentEntity();
    issueCommentEntity.issueId = issueEntity.id;
    issueCommentEntity.commentNumber = commentNumber;
    issueCommentEntity.authorId = context.me.id;
    issueCommentEntity.content = comment.content;

    return await context.connection.transaction(async (transaction) => {
        const commentRepoForTransaction = transaction.getCustomRepository(PackageIssueCommentRepository);
        const savedComment = await commentRepoForTransaction.save(issueCommentEntity);

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.PACKAGE_ISSUE_COMMENT_CREATED,
            targetPackageIssueId: issueEntity.id,
            targetPackageId: packageEntity.id
        });

        return savedComment;
    });
};

export const updatePackageIssueComment = async (
    _0: unknown,
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
    context: AuthenticatedContext
): Promise<IssueCommentEntity> => {
    const commentRepository = context.connection.manager.getCustomRepository(PackageIssueCommentRepository);
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);

    const commentEntity = await getCommentToEditOrFail(context, packageIdentifier, issueCommentIdentifier, issueEntity);

    commentEntity.content = comment.content;

    return await context.connection.transaction(async (transaction) => {
        const commentRepoForTransaction = transaction.getCustomRepository(PackageIssueCommentRepository);
        const savedComment = await commentRepoForTransaction.save(commentEntity);

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.PACKAGE_ISSUE_COMMENT_EDIT,
            targetPackageIssueId: issueEntity.id,
            targetPackageId: packageEntity.id
        });

        return savedComment;
    });
};

export const deletePackageIssueComment = async (
    _0: unknown,
    {
        packageIdentifier,
        issueIdentifier,
        issueCommentIdentifier
    }: {
        packageIdentifier: PackageIdentifierInput;
        issueIdentifier: PackageIssueIdentifierInput;
        issueCommentIdentifier: PackageIssueCommentIdentifierInput;
    },
    context: AuthenticatedContext
): Promise<void> => {
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);

    const commentEntity = await getCommentToEditOrFail(context, packageIdentifier, issueCommentIdentifier, issueEntity);

    await context.connection.transaction(async (transaction) => {
        const commentRepoForTransaction = transaction.getCustomRepository(PackageIssueCommentRepository);
        await commentRepoForTransaction.delete(commentEntity.id);

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.PACKAGE_ISSUE_COMMENT_DELETED,
            targetPackageIssueId: issueEntity.id,
            targetPackageId: packageEntity.id
        });
    });
};

async function getCommentToEditOrFail(
    context: Context,
    packageIdentifier: PackageIdentifierInput,
    issueCommentIdentifier: PackageIssueCommentIdentifierInput,
    issueEntity: PackageIssueEntity
) {
    const commentRepository = context.connection.manager.getCustomRepository(PackageIssueCommentRepository);
    const commentEntity = await commentRepository.getCommentByIssueIdAndCommentNumber(
        issueEntity.id,
        issueCommentIdentifier.commentNumber
    );

    if (!commentEntity) {
        throw new Error("COMMENT_NOT_FOUND");
    }

    const canEdit = await hasPermissionsToEditComment(commentEntity, packageIdentifier, context);
    if (!canEdit) {
        throwNotAuthorizedError();
    }

    return commentEntity;
}

async function hasPermissionsToEditComment(
    commentEntity: IssueCommentEntity,
    packageIdentifier: PackageIdentifierInput,
    context: Context
): Promise<boolean> {
    if (!isAuthenticatedContext(context)) {
        return false;
    }
    const authenicatedContext = context as AuthenticatedContext;

    const packagePermissions = await resolvePackagePermissions(context, packageIdentifier, authenicatedContext.me);
    return hasEditPermissionsForComment(commentEntity, packagePermissions, context);
}

function hasEditPermissionsForComment(
    commentEntity: IssueCommentEntity,
    packagePermissions: Permission[],
    context: Context
): boolean {
    if (!isAuthenticatedContext(context)) {
        return false;
    }

    const authenicatedContext = context as AuthenticatedContext;

    if (packagePermissions.includes(Permission.MANAGE)) {
        return true;
    }

    return commentEntity.authorId === authenicatedContext.me.id;
}

function throwNotAuthorizedError(): void {
    throw new Error("NOT_AUTHORIZED");
}
