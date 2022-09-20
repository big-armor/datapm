import { ValidationError } from "apollo-server";
import { emailAddressValid } from "datapm-lib";
import { AuthenticatedContext } from "../context";
import { UserEntity } from "../entity/UserEntity";
import {
    ActivityLogEventType,
    PackageIdentifierInput,
    SetPackagePermissionInput,
    UserStatus
} from "../generated/graphql";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";
import { PackageRepository } from "../repository/PackageRepository";
import { UserRepository } from "../repository/UserRepository";
import { asyncForEach } from "../util/AsyncUtils";
import { sendInviteUser, sendShareNotification, validateMessageContents } from "../util/smtpUtil";
import { deletePackageFollowByUserId, deletePackageIssuesFollowsByUserId } from "./FollowResolver";
import { getPackageFromCacheOrDbOrFail } from "./PackageResolver";

export const setPackagePermissions = async (
    _0: unknown,
    {
        identifier,
        value,
        message
    }: {
        identifier: PackageIdentifierInput;
        value: SetPackagePermissionInput[];
        message: string;
    },
    context: AuthenticatedContext
): Promise<void> => {
    validateMessageContents(message);

    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackage({ identifier, relations: ["catalog"] });

    if (packageEntity == null) {
        throw new Error("PACKAGE_NOT_FOUND - " + identifier.catalogSlug + "/" + identifier.packageSlug);
    }

    const inviteUsers: UserEntity[] = [];
    const existingUsers: UserEntity[] = [];

    await context.connection.transaction(async (transaction) => {
        await asyncForEach(value, async (userPackagePermission) => {
            let user = await transaction
                .getCustomRepository(UserRepository)
                .getUserByUsernameOrEmailAddress(userPackagePermission.usernameOrEmailAddress);

            const packagePermissionRepository = transaction.getCustomRepository(PackagePermissionRepository);
            if (userPackagePermission.permissions.length === 0) {
                if (!user) {
                    return;
                }

                if (!packageEntity.isPublic) {
                    await deletePackageFollowByUserId(transaction, packageEntity.id, user.id);
                    await deletePackageIssuesFollowsByUserId(transaction, packageEntity.id, user.id);
                }

                await packagePermissionRepository.removePackagePermissionForUser({
                    identifier,
                    user
                });

                await createActivityLog(transaction, {
                    userId: context.me.id,
                    eventType: ActivityLogEventType.PACKAGE_USER_PERMISSION_REMOVED,
                    targetPackageId: packageEntity.id,
                    targetUserId: user.id,
                    permissions: userPackagePermission.permissions
                });

                return;
            }

            if (user == null) {
                if (emailAddressValid(userPackagePermission.usernameOrEmailAddress) === true) {
                    const inviteUser = await context.connection
                        .getCustomRepository(UserRepository)
                        .createInviteUser(userPackagePermission.usernameOrEmailAddress);

                    user = inviteUser;
                    inviteUsers.push(inviteUser);
                } else {
                    throw new ValidationError("USER_NOT_FOUND - " + userPackagePermission.usernameOrEmailAddress);
                }
            } else {
                if (user.status === UserStatus.PENDING_SIGN_UP) {
                    inviteUsers.push(user);
                } else {
                    existingUsers.push(user);
                }
            }

            await packagePermissionRepository.setPackagePermissions({
                identifier,
                userId: user.id,
                permissions: userPackagePermission.permissions
            });

            await createActivityLog(transaction, {
                userId: context.me.id,
                eventType: ActivityLogEventType.PACKAGE_USER_PERMISSION_ADDED_UPDATED,
                targetPackageId: packageEntity.id,
                targetUserId: user.id
            });
        });
    });

    await asyncForEach(existingUsers, async (user) => {
        await sendShareNotification(
            user,
            context.me.displayName,
            packageEntity.displayName,
            "/" + packageEntity.catalog.slug + "/" + packageEntity.slug,
            message
        );
    });

    await asyncForEach(inviteUsers, async (user) => {
        await sendInviteUser(user, context.me.displayName, packageEntity.displayName, message);
    });
};

export const removePackagePermissions = async (
    _0: unknown,
    { identifier, usernameOrEmailAddress }: { identifier: PackageIdentifierInput; usernameOrEmailAddress: string },
    context: AuthenticatedContext
): Promise<void> => {
    return context.connection.transaction(async (transaction) => {
        const user = await transaction
            .getCustomRepository(UserRepository)
            .getUserByUsernameOrEmailAddress(usernameOrEmailAddress);
        if (!user) {
            throw new Error("USER_NOT_FOUND-" + usernameOrEmailAddress);
        }

        const packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier);

        if (packageEntity == null)
            throw new Error("PACKAGE_NOT_FOUND - " + identifier.catalogSlug + "/" + identifier.packageSlug);

        if (!packageEntity.isPublic) {
            await deletePackageFollowByUserId(transaction, packageEntity.id, user.id);
            await deletePackageIssuesFollowsByUserId(transaction, packageEntity.id, user.id);
        }

        await transaction.getCustomRepository(PackagePermissionRepository).removePackagePermissionForUser({
            identifier,
            user
        });

        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.PACKAGE_USER_PERMISSION_REMOVED,
            targetPackageId: packageEntity.id,
            targetUserId: user.id
        });
    });
};
