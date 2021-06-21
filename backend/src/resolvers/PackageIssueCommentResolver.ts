import { AuthenticatedContext, Context } from "../context";
import { resolvePackagePermissions } from "../directive/hasPackagePermissionDirective";
import { IssueCommentEntity } from "../entity/IssueCommentEntity";
import {
    ActivityLogEventType,
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
import { createActivityLog } from "../repository/ActivityLogRepository";
import { PackageIssueEntity } from "../entity/PackageIssueEntity";

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
        const savedComment = await commentRepository.save(issueCommentEntity);

        await createActivityLog(transaction, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.PACKAGE_ISSUE_COMMENT_CREATED,
            targetPackageIssueId: issueEntity.id,
            targetPackageId: packageEntity.id
        });

        return savedComment;
    });
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
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);

    const commentEntity = await getCommentToEditOrFail(
        context,
        packageIdentifier,
        issueCommentIdentifier,
        issueEntity
    );

    commentEntity.content = comment.content;

    return await context.connection.transaction(async (transaction) => {
        const savedComment = await commentRepository.save(commentEntity);

        await createActivityLog(transaction, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.PACKAGE_ISSUE_COMMENT_EDIT,
            targetPackageIssueId: issueEntity.id,
            targetPackageId: packageEntity.id
        });

        return savedComment;
    });
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
    const packageEntity = await context.connection.manager
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier: packageIdentifier });

    const issueEntity = await context.connection.manager
        .getCustomRepository(PackageIssueRepository)
        .getByIssueNumberForPackage(packageEntity.id, issueIdentifier.issueNumber);

    const commentEntity = await getCommentToEditOrFail(
        context,
        packageIdentifier,
        issueCommentIdentifier,
        issueEntity
    );

    await context.connection.transaction(async (transaction) => {
        await commentRepository.delete(commentEntity.id);

        await createActivityLog(transaction, {
            userId: context!.me!.id,
            eventType: ActivityLogEventType.PACKAGE_ISSUE_COMMENT_DELETED,
            targetPackageIssueId: issueEntity.id,
            targetPackageId: packageEntity.id
        });
    });
}

async function getCommentToEditOrFail(
    context: any,
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
    if (!context.me) {
        return false;
    }

    const packagePermissions = await resolvePackagePermissions(context, packageIdentifier, context.me);
    return hasEditPermissionsForComment(commentEntity, packagePermissions, context);
}

function hasEditPermissionsForComment(
    commentEntity: IssueCommentEntity,
    packagePermissions: Permission[],
    context: Context
): boolean {
    if (!context.me) {
        return false;
    }

    if (packagePermissions.includes(Permission.MANAGE)) {
        return true;
    }

    return commentEntity.authorId === context.me.id;
}

function throwNotAuthorizedError(): void {
    throw new Error("NOT_AUTHORIZED");
}
