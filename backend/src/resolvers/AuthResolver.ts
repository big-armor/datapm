import { ApolloError, AuthenticationError, UserInputError, ValidationError } from "apollo-server";
import { GraphQLResolveInfo } from "graphql";
import { AuthenticatedContext } from "../context";
import { UserEntity } from "../entity/UserEntity";
import { AUTHENTICATION_ERROR, UserStatus } from "../generated/graphql";
import { UserRepository } from "../repository/UserRepository";
import { createJwt } from "../util/jwt";
import { hashPassword } from "../util/PasswordUtil";
import { getGraphQlRelationName } from "../util/relationNames";

export const login = async (
    _0: unknown,
    { username, password }: { username: string; password: string },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<string> => {
    const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .getUserByLogin(username, getGraphQlRelationName(info));

    if (user == null) {
        throw new AuthenticationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
    }

    const hash = hashPassword(password, user.passwordSalt);
    if (hash !== user.passwordHash) {
        throw new AuthenticationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
    }

    if (!user.emailVerified) {
        throw new UserInputError(AUTHENTICATION_ERROR.EMAIL_ADDRESS_NOT_VERIFIED);
    }

    if (UserStatus.SUSPENDED === user.status) {
        throw new UserInputError(AUTHENTICATION_ERROR.ACCOUNT_SUSPENDED);
    }

    return createJwt(user);
};

export const logout = async (
    _0: unknown,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    throw new ApolloError("Logout is not implemented on the server side. Simply discard the JWT on the client side.");
};

export const verifyEmailAddress = async (
    _0: unknown,
    { token }: { token: string },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<void> => {
    // Get the token

    return context.connection.manager.nestedTransaction(async (manager) => {
        const user = await manager.getCustomRepository(UserRepository).findByEmailValidationToken(token);

        if (user == null) {
            throw new UserInputError("TOKEN_NOT_VALID");
        }

        // Verify that the token was created in the last 4 hours
        if (new Date().getMilliseconds() - user.verifyEmailTokenDate.getMilliseconds() > 4 * 60 * 60 * 1000) {
            // TODO Automatically send another token
            throw new UserInputError("TOKEN_IS_TOO_OLD");
        }

        user.emailVerified = true;
        delete user.verifyEmailToken;
        user.verifyEmailTokenDate = new Date();

        manager.save(user);
    });
};
