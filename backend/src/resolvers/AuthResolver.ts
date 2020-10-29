import { ApolloError, AuthenticationError, UserInputError, ValidationError } from "apollo-server";
import { AuthenticatedContext } from "../context";
import { User } from "../entity/User";
import { AUTHENTICATION_ERROR } from "../generated/graphql";
import { UserRepository } from "../repository/UserRepository";
import { createJwt } from "../util/jwt";
import { hashPassword } from "../util/PasswordUtil";
import { getGraphQlRelationName } from "../util/relationNames";

export const login = async (
    _0: any,
    { username, password }: { username: string; password: string },
    context: AuthenticatedContext,
    info: any
) => {
    const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .getUserByLogin(username, getGraphQlRelationName(info));

    if (user == null) {
        throw new AuthenticationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
    }

    const hash = hashPassword(password, user.passwordSalt);
    if (hash != user.passwordHash) {
        throw new AuthenticationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
    }

    if (process.env["REQUIRE_EMAIL_VERIFICATION"] != "false" && !user.emailVerified) {
        throw new UserInputError(AUTHENTICATION_ERROR.EMAIL_ADDRESS_NOT_VERIFIED);
    }

    return createJwt(user);
};

export const logout = async (_0: any, {}, context: AuthenticatedContext, info: any) => {
    throw new ApolloError("Logout is not implemented on the server side. Simply discard the JWT on the client side.");
};

export const verifyEmailAddress = async (
    _0: any,
    { token }: { token: String },
    context: AuthenticatedContext,
    info: any
) => {
    // Get the token

    return context.connection.manager.nestedTransaction(async (manager) => {
        let user = await manager.getCustomRepository(UserRepository).findByEmailValidationToken(token);

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
