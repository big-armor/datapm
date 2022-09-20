import { AuthenticationError, UserInputError, ValidationError } from "apollo-server";
import { AuthenticatedContext, Context } from "../context";
import {
    AUTHENTICATION_ERROR,
    Base64ImageUpload,
    CreateUserInput,
    RecoverMyPasswordInput,
    UpdateMyPasswordInput,
    UpdateUserInput,
    ActivityLogEventType,
    UserStatus,
    CurrentUser
} from "../generated/graphql";
import { CatalogRepository } from "../repository/CatalogRepository";
import { getUserByUsernameOrFail, UserRepository } from "../repository/UserRepository";
import { hashPassword } from "../util/PasswordUtil";
import { getGraphQlRelationName } from "../util/relationNames";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { FirstUserStatusHolder } from "./FirstUserStatusHolder";
import { UserEntity } from "../entity/UserEntity";
import { ReservedKeywordsService } from "../service/reserved-keywords-service";
import { sendUserSuspendedEmail } from "../util/smtpUtil";
import { Connection, EntityManager } from "typeorm";
import { GraphQLResolveInfo } from "graphql";

const USER_SEARCH_RESULT_LIMIT = 100;
export const searchUsers = async (
    _0: unknown,
    { value, limit, offSet }: { value: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{
    hasMore: boolean;
    users: UserEntity[];
    count: number;
}> => {
    const clampedLimit = Math.min(limit, USER_SEARCH_RESULT_LIMIT);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(UserRepository)
        .search({ value, limit: clampedLimit, offSet });

    return {
        hasMore: count - (offSet + clampedLimit) > 0,
        users: searchResponse,
        count
    };
};

export const adminSearchUsers = async (
    _0: unknown,
    { value, limit, offSet }: { value: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<{
    hasMore: boolean;
    users: UserEntity[];
    count: number;
}> => {
    const clampedLimit = Math.min(limit, USER_SEARCH_RESULT_LIMIT);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(UserRepository)
        .searchWithNoRestrictions({ value, limit: clampedLimit, offSet });

    return {
        hasMore: count - (offSet + clampedLimit) > 0,
        users: searchResponse,
        count
    };
};

export const adminSetUserStatus = async (
    _0: unknown,
    { username, status, message }: { username: string; status: UserStatus; message?: string | undefined | null },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return context.connection.transaction(async (transaction) => {
        const targetUser = await getUserByUsernameOrFail({
            username,
            manager: transaction
        });

        if (UserStatus.SUSPENDED === status) {
            sendUserSuspendedEmail(targetUser, message || "");
        }

        await createActivityLog(transaction, {
            userId: context.me.id,
            targetUserId: targetUser.id,
            eventType: ActivityLogEventType.USER_STATUS_CHANGED
        });

        const repository = context.connection.manager.getCustomRepository(UserRepository);
        return repository.updateUserStatus(username, status);
    });
};

export const emailAddressAvailable = async (
    _0: unknown,
    { emailAddress }: { emailAddress: string },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<boolean> => {
    const user = await context.connection.manager.getCustomRepository(UserRepository).getUserByEmail(emailAddress);

    if (user != null && user.status === UserStatus.PENDING_SIGN_UP) return true;

    return user == null;
};

export const usernameAvailable = async (
    _0: unknown,
    { username }: { username: string },
    context: Context
): Promise<boolean> => {
    ReservedKeywordsService.validateReservedKeyword(username);
    const user = await context.connection.manager.getCustomRepository(UserRepository).getUserByUsername(username);

    const catalog = await context.connection.manager
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlug({ slug: username });

    return user == null && catalog == null;
};

export const createMe = async (
    _0: unknown,
    { value }: { value: CreateUserInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    if ((await emailAddressAvailable(_0, { emailAddress: value.emailAddress }, context, info)) === false) {
        FirstUserStatusHolder.IS_FIRST_USER_CREATED = true;
        throw new ValidationError("EMAIL_ADDRESS_NOT_AVAILABLE");
    }

    if ((await usernameAvailable(_0, { username: value.username }, context)) === false) {
        FirstUserStatusHolder.IS_FIRST_USER_CREATED = true;
        throw new ValidationError("USERNAME_NOT_AVAILABLE");
    }

    await context.connection.transaction(async (transaction) => {
        const existingUser = await transaction.getCustomRepository(UserRepository).getUserByEmail(value.emailAddress);

        let user = null;

        if (existingUser != null) {
            user = existingUser;
        } else {
            user = transaction.create(UserEntity);
        }

        const createdUser = await transaction.getCustomRepository(UserRepository).completeCreatedUser({
            user,
            value,
            relations: getGraphQlRelationName(info)
        });

        await createActivityLog(transaction, {
            userId: createdUser.id,
            eventType: ActivityLogEventType.USER_CREATED
        });
    });
};

export const setAsAdmin = async (
    _0: unknown,
    { username, isAdmin }: { username: string; isAdmin: boolean },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return await context.connection.manager.getCustomRepository(UserRepository).updateUserAdminStatus({
        username,
        isAdmin
    });
};

export const updateMe = async (
    _0: unknown,
    { value }: { value: UpdateUserInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<CurrentUser> => {
    const user = await context.connection.transaction(async (transaction) => {
        await createActivityLog(transaction, {
            userId: context.me.id,
            targetUserId: context.me.id,
            eventType: ActivityLogEventType.USER_EDIT,
            propertiesEdited: Object.keys(value)
        });

        return await transaction.getCustomRepository(UserRepository).updateUser({
            username: context.me.username,
            value
        });
    });

    const userIsAdmin = await context.connection.manager.getCustomRepository(UserRepository).userIsAdmin(user);

    return {
        user,
        isAdmin: userIsAdmin
    };
};

export const forgotMyPassword = async (
    _0: unknown,
    { emailAddress }: { emailAddress: string },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    const user = await context.connection.manager.getCustomRepository(UserRepository).getUserByLogin(emailAddress);

    // return a "fake" successful resolve if user not found
    if (user == null) return Promise.resolve();

    return await context.connection.manager.getCustomRepository(UserRepository).forgotMyPassword({
        user
    });
};

export const recoverMyPassword = async (
    _0: unknown,
    { value }: { value: RecoverMyPasswordInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    await context.connection.manager.getCustomRepository(UserRepository).recoverMyPassword({
        value
    });
};

export const updateMyPassword = async (
    _0: unknown,
    { value }: { value: UpdateMyPasswordInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .getUserByLogin(context.me.username, getGraphQlRelationName(info));

    if (user == null) {
        throw new AuthenticationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
    }

    const oldPasswordHash = hashPassword(value.oldPassword, user.passwordSalt);
    if (oldPasswordHash !== user.passwordHash) {
        throw new AuthenticationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
    }

    const newPasswordHash = hashPassword(value.newPassword, user.passwordSalt);

    return await context.connection.manager.getCustomRepository(UserRepository).updateUserPassword({
        username: context.me.username,
        passwordHash: newPasswordHash
    });
};

export const setMyCoverImage = async (
    _0: unknown,
    { image }: { image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return ImageStorageService.INSTANCE.saveUserCoverImage(context.me.id, image.base64);
};

export const setMyAvatarImage = async (
    _0: unknown,
    { image }: { image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return ImageStorageService.INSTANCE.saveUserAvatarImage(context.me.id, image.base64);
};

export const deleteMe = async (
    _0: unknown,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return await deleteUserAndLogAction(context.me.username, context);
};

export const adminDeleteUser = async (
    _0: unknown,
    { usernameOrEmailAddress }: { usernameOrEmailAddress: string },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    return await deleteUserAndLogAction(usernameOrEmailAddress, context);
};

const deleteUserAndLogAction = async (usernameOrEmailAddress: string, context: AuthenticatedContext) => {
    await context.connection.transaction(async (transaction) => {
        const userRepository = transaction.getCustomRepository(UserRepository);
        const user = await transaction
            .getCustomRepository(UserRepository)
            .getUserByUsernameOrEmailAddress(usernameOrEmailAddress);
        if (!user) {
            throw new Error("USER_NOT_FOUND-" + usernameOrEmailAddress);
        }

        await createActivityLog(transaction, {
            userId: context.me.id,
            targetUserId: user.id,
            eventType: ActivityLogEventType.USER_DELETED
        });

        return await userRepository.deleteUser(user);
    });
};

export const acceptInvite = async (
    _0: unknown,
    { username, token, password }: { username: string; token: string; password: string },
    context: Context,
    info: GraphQLResolveInfo
): Promise<void> => {
    return context.connection.transaction(async (transaction) => {
        const user = await transaction.getCustomRepository(UserRepository).findByEmailValidationToken(token);

        if (user == null) {
            throw new UserInputError("TOKEN_NOT_VALID");
        }

        if ((await usernameAvailable(_0, { username: username }, context)) === false) {
            throw new ValidationError("USERNAME_NOT_AVAILABLE");
        }

        user.emailVerified = true;

        await transaction.getCustomRepository(UserRepository).completeCreatedUser({
            user,
            value: {
                emailAddress: user.emailAddress,
                password,
                username
            }
        });

        await transaction.save(user);
    });
};

export const getUserFromCacheOrDbByIdOrFail = async (
    context: Context,
    connection: EntityManager | Connection,
    id: number,
    relations: string[] = []
): Promise<UserEntity> => {
    const userPromiseFunction = () =>
        connection.getCustomRepository(UserRepository).findOneOrFail({
            where: { id },
            relations
        });

    const response = await context.cache.loadUser(id, userPromiseFunction);

    if (response == null) throw new Error("USER_NOT_FOUND-" + id);

    return response;
};

export const getUserFromCacheOrDbByUsernameOrFail = async (
    context: Context,
    username: string,
    relations: string[] = []
): Promise<UserEntity> => {
    const userPromiseFunction = () =>
        context.connection.getCustomRepository(UserRepository).findUserByUserNameOrFail({ username, relations });
    const response = await context.cache.loadUserByUsername(username, userPromiseFunction);

    if (response == null) throw new Error("USER_NOT_FOUND-" + username);

    return response;
};
