import { ApolloError, AuthenticationError, ValidationError } from "apollo-server";
import { AuthenticatedContext } from "../context";
import { AUTHENTICATION_ERROR, CreateUserInput, UpdateMyPasswordInput, UpdateUserInput } from "../generated/graphql";
import { CatalogRepository } from "../repository/CatalogRepository";
import { UserRepository } from "../repository/UserRepository";
import { hashPassword } from "../util/PasswordUtil";
import { getGraphQlRelationName } from "../util/relationNames";

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

export const disableMe = async (_0: any, {}, context: AuthenticatedContext, info: any) => {
    return await context.connection.manager.getCustomRepository(UserRepository).markUserActiveStatus({
        username: context.me.username,
        active: false,
        relations: getGraphQlRelationName(info)
    });
};
