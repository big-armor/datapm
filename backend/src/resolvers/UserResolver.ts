import { AuthenticationError, ValidationError, UserInputError } from "apollo-server";
import { AuthenticatedContext } from "../context";
import {
    AUTHENTICATION_ERROR,
    Base64ImageUpload,
    CreateUserInput,
    RecoverMyPasswordInput,
    UpdateMyPasswordInput,
    UpdateUserInput
} from "../generated/graphql";
import { CatalogRepository } from "../repository/CatalogRepository";
import { UserRepository } from "../repository/UserRepository";
import { hashPassword } from "../util/PasswordUtil";
import { getGraphQlRelationName } from "../util/relationNames";
import { ImageStorageService } from "../storage/images/image-storage-service";

export const emailAddressAvailable = async (
    _0: any,
    { emailAddress }: { emailAddress: string },
    context: AuthenticatedContext,
    info: any
) => {
    const user = await context.connection.manager.getCustomRepository(UserRepository).getUserByEmail(emailAddress);

    return user == null;
};

export const usernameAvailable = async (_0: any, { username }: { username: string }, context: AuthenticatedContext) => {
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
        throw new ValidationError("EMAIL_ADDRESS_NOT_AVAILABLE");
    }

    if ((await usernameAvailable(_0, { username: value.username }, context)) == false) {
        throw new ValidationError("USERNAME_NOT_AVAILABLE");
    }
    return await context.connection.manager.getCustomRepository(UserRepository).createUser({
        value,
        relations: getGraphQlRelationName(info)
    });
};

export const updateMe = async (
    _0: any,
    { value }: { value: UpdateUserInput },
    context: AuthenticatedContext,
    info: any
) => {
    return await context.connection.manager.getCustomRepository(UserRepository).updateUser({
        username: context.me.username,
        value,
        relations: getGraphQlRelationName(info)
    });
};

export const forgotMyPassword = async (
    _0: any,
    { emailAddress }: { emailAddress: string },
    context: AuthenticatedContext,
    info: any
) => {
    const user = await context.connection.manager.getCustomRepository(UserRepository).getUserByEmail(emailAddress);

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
    const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .getUserByEmail(value.emailAddress);

    if (user == null) throw new UserInputError("USER_NOT_FOUND");

    return await context.connection.manager.getCustomRepository(UserRepository).recoverMyPassword({
        user: user,
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
    return ImageStorageService.INSTANCE.saveUserCoverImage(context.me.username, image.base64);
};

export const setMyAvatarImage = async (
    _0: any,
    { image }: { image: Base64ImageUpload },
    context: AuthenticatedContext,
    info: any
): Promise<void> => {
    return ImageStorageService.INSTANCE.saveUserAvatarImage(context.me.username, image.base64);
};

export const deleteMe = async (_0: any, {}, context: AuthenticatedContext, info: any) => {
    return await context.connection.manager.getCustomRepository(UserRepository).deleteUser({
        username: context.me.username
    });
};
