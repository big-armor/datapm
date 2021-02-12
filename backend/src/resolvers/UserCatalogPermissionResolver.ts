import { ValidationError } from "apollo-server";
import { emailAddressValid } from "datapm-lib";
import { AuthenticatedContext, Context } from "../context";
import { UserEntity } from "../entity/UserEntity";
import { CatalogIdentifierInput, Permission, SetUserCatalogPermissionInput, UserStatus } from "../generated/graphql";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { CatalogRepository } from "../repository/CatalogRepository";
import { UserRepository } from "../repository/UserRepository";
import { asyncForEach } from "../util/AsyncForEach";
import { sendInviteUser, sendShareNotification, validateMessageContents } from "../util/smtpUtil";

export const hasCatalogPermissions = async (context: Context, catalogId: number, permission: Permission) => {
    if (permission == Permission.VIEW) {
        const collection = await context.connection.getCustomRepository(CatalogRepository).findOne({ id: catalogId });

        if (collection?.isPublic) return true;
    }

    if (context.me == null) {
        return false;
    }

    return context.connection
        .getCustomRepository(UserCatalogPermissionRepository)
        .hasPermission(context.me.id, catalogId, permission);
};

export const setUserCatalogPermission = async (
    _0: any,
    {
        identifier,
        value,
        message
    }: {
        identifier: CatalogIdentifierInput;
        value: SetUserCatalogPermissionInput[];
        message: string;
    },
    context: AuthenticatedContext,
    info: any
) => {
    validateMessageContents(message);

    const catalogEntity = await context.connection
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlugOrFail(identifier.catalogSlug);

    const inviteUsers: UserEntity[] = [];
    const existingUsers: UserEntity[] = [];

    await context.connection.transaction(async (transaction) => {
        await asyncForEach(value, async (userCatalogPermission) => {
            let user = await transaction
                .getCustomRepository(UserRepository)
                .getUserByUsernameOrEmailAddress(userCatalogPermission.usernameOrEmailAddress);

            const catalogPermissionRepository = transaction.getCustomRepository(UserCatalogPermissionRepository);
            if (userCatalogPermission.permission.length === 0) {
                if (!user) {
                    return;
                }

                return await catalogPermissionRepository.deleteUserCatalogPermissionsForUser({
                    identifier,
                    user
                });
            }

            if (user == null) {
                if (emailAddressValid(userCatalogPermission.usernameOrEmailAddress) === true) {
                    const inviteUser = await context.connection
                        .getCustomRepository(UserRepository)
                        .createInviteUser(userCatalogPermission.usernameOrEmailAddress);

                    inviteUsers.push(inviteUser);
                } else {
                    throw new ValidationError("USER_NOT_FOUND - " + userCatalogPermission.usernameOrEmailAddress);
                }
            } else {
                if (user.status == UserStatus.PENDING_SIGN_UP) {
                    inviteUsers.push(user);
                } else {
                    existingUsers.push(user);
                }
            }

            await transaction.getCustomRepository(UserCatalogPermissionRepository).setUserCatalogPermission({
                identifier,
                value: userCatalogPermission
            });
        });
    });

    await asyncForEach(inviteUsers, async (user) => {
        await sendShareNotification(
            user,
            context.me.displayName,
            catalogEntity.displayName,
            "/" + catalogEntity.slug,
            message
        );
    });

    await asyncForEach(inviteUsers, async (user) => {
        await sendInviteUser(user, context.me.displayName, catalogEntity.displayName, message);
    });
};

export const deleteUserCatalogPermissions = async (
    _0: any,
    { identifier, usernameOrEmailAddress }: { identifier: CatalogIdentifierInput; usernameOrEmailAddress: string },
    context: AuthenticatedContext
) => {
    return context.connection.getCustomRepository(UserCatalogPermissionRepository).deleteUserCatalogPermissions({
        identifier,
        usernameOrEmailAddress
    });
};
