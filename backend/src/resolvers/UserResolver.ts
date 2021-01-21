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
    UserStatus
} from "../generated/graphql";
import { CatalogRepository } from "../repository/CatalogRepository";
import { UserRepository } from "../repository/UserRepository";
import { hashPassword } from "../util/PasswordUtil";
import { getGraphQlRelationName } from "../util/relationNames";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { createActivityLog } from "../repository/ActivityLogRepository";
import { FirstUserStatusHolder } from "./FirstUserStatusHolder";

export const searchUsers = async (
    _0: any,
    { value, limit, offSet }: { value: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: any
) => {
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(UserRepository)
        .search({ value, limit, offSet });

    return {
        hasMore: count - (offSet + limit) > 0,
        users: searchResponse,
        count
    };
};

export const emailAddressAvailable = async (
    _0: any,
    { emailAddress }: { emailAddress: string },
    context: AuthenticatedContext,
    info: any
) => {
    const user = await context.connection.manager.getCustomRepository(UserRepository).getUserByEmail(emailAddress);

    return user == null;
};

export const usernameAvailable = async (_0: any, { username }: { username: string }, context: Context) => {
    const user = await context.connection.manager.getCustomRepository(UserRepository).getUserByUsername(username);

    const catalog = await context.connection.manager
        .getCustomRepository(CatalogRepository)
        .findCatalogBySlug({ slug: username });

    return user == null && catalog == null;
};

export const createMe = async (
    _0: any,
    { value }: { value: CreateUserInput },
    context: AuthenticatedContext,
    info: any
) => {
    if ((await emailAddressAvailable(_0, { emailAddress: value.emailAddress }, context, info)) == false) {
        FirstUserStatusHolder.IS_FIRST_USER_CREATED = true;
        throw new ValidationError("EMAIL_ADDRESS_NOT_AVAILABLE");
    }

    if ((await usernameAvailable(_0, { username: value.username }, context)) == false) {
        FirstUserStatusHolder.IS_FIRST_USER_CREATED = true;
        throw new ValidationError("USERNAME_NOT_AVAILABLE");
    }

    const repository = context.connection.manager.getCustomRepository(UserRepository);
    if (!FirstUserStatusHolder.IS_FIRST_USER_CREATED) {
        FirstUserStatusHolder.IS_FIRST_USER_CREATED = (await repository.isAtLeastOneUserRegistered()) === 1;
    }

    await context.connection.transaction(async (transaction) => {
        const user = await transaction.getCustomRepository(UserRepository).createUser({
            value,
            relations: getGraphQlRelationName(info)
        });

        await createActivityLog(transaction, {
            userId: user.id,
            eventType: ActivityLogEventType.USER_CREATED
        });
    });
};

export const setAsAdmin = async (
    _0: any,
    { username, isAdmin }: { username: string; isAdmin: boolean },
    context: AuthenticatedContext,
    info: any
) => {
    return await context.connection.manager.getCustomRepository(UserRepository).updateUserAdminStatus({
        username,
        isAdmin
    });
};

export const updateMe = async (
    _0: any,
    { value }: { value: UpdateUserInput },
    context: AuthenticatedContext,
    info: any
) => {
    return context.connection.transaction(async (transaction) => {
        await createActivityLog(transaction, {
            userId: context.me.id,
            eventType: ActivityLogEventType.USER_EDIT,
            propertiesEdited: Object.keys(value)
        });

        return await transaction.getCustomRepository(UserRepository).updateUser({
            username: context.me.username,
            value,
            relations: getGraphQlRelationName(info)
        });
    });
};

export const forgotMyPassword = async (
    _0: any,
    { emailAddress }: { emailAddress: string },
    context: AuthenticatedContext,
    info: any
) => {
    const user = await context.connection.manager.getCustomRepository(UserRepository).getUserByLogin(emailAddress);

    // return a "fake" successful resolve if user not found
    if (user == null) return Promise.resolve();

    return await context.connection.manager.getCustomRepository(UserRepository).forgotMyPassword({
        user
    });
};

export const recoverMyPassword = async (
    _0: any,
    { value }: { value: RecoverMyPasswordInput },
    context: AuthenticatedContext,
    info: any
) => {
    await context.connection.manager.getCustomRepository(UserRepository).recoverMyPassword({
        value
    });
};

export const updateMyPassword = async (
    _0: any,
    { value }: { value: UpdateMyPasswordInput },
    context: AuthenticatedContext,
    info: any
) => {
    const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .getUserByLogin(context.me.username, getGraphQlRelationName(info));

    if (user == null) {
        throw new AuthenticationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
    }

    const oldPasswordHash = hashPassword(value.oldPassword, user.passwordSalt);
    if (oldPasswordHash != user.passwordHash) {
        throw new AuthenticationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
    }

    const newPasswordHash = hashPassword(value.newPassword, user.passwordSalt);

    return await context.connection.manager.getCustomRepository(UserRepository).updateUserPassword({
        username: context.me.username,
        passwordHash: newPasswordHash
    });
};

export const setMyCoverImage = async (
    _0: any,
    { image }: { image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: any
) => {
    return ImageStorageService.INSTANCE.saveUserCoverImage(context.me.id, image.base64);
};

export const setMyAvatarImage = async (
    _0: any,
    { image }: { image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: any
): Promise<void> => {
    return ImageStorageService.INSTANCE.saveUserAvatarImage(context.me.id, image.base64);
};

export const deleteMe = async (_0: any, {}, context: AuthenticatedContext, info: any) => {
    context.connection.transaction(async (transaction) => {
        const user = await transaction
            .getCustomRepository(UserRepository)
            .findUserByUserName({ username: context.me.username });

        await createActivityLog(transaction, {
            userId: user.id,
            eventType: ActivityLogEventType.USER_DELETED
        });

        return await transaction.getCustomRepository(UserRepository).deleteUser({
            username: context.me.username
        });
    });
};

export const acceptInvite = async (
    _0: any,
    { username, token, password }: { username: string; token: string; password: string },
    context: Context,
    info: any
): Promise<void> => {
    return context.connection.transaction(async (transaction) => {
        const user = await transaction.getCustomRepository(UserRepository).findByEmailValidationToken(token);

        if (user == null) {
            throw new UserInputError("TOKEN_NOT_VALID");
        }

        if ((await usernameAvailable(_0, { username: username }, context)) == false) {
            throw new ValidationError("USERNAME_NOT_AVAILABLE");
        }

        user.passwordHash = hashPassword(password, user.passwordSalt);
        user.username = username;
        user.emailVerified = true;
        delete user.verifyEmailToken;
        user.verifyEmailTokenDate = new Date();
        user.status = UserStatus.ACTIVE;

        await transaction.save(user);
    });
};
