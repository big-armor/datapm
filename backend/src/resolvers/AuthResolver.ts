import { ApolloError, AuthenticationError } from "apollo-server";
import { AuthenticatedContext } from "../context";
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
		throw new AuthenticationError(AUTHENTICATION_ERROR.USER_NOT_FOUND);
	}

	const hash = hashPassword(password, user.passwordSalt);
	if (hash != user.passwordHash) {
		throw new AuthenticationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
	}
	return createJwt(user);
};

export const logout = async (_0: any, {}, context: AuthenticatedContext, info: any) => {
	throw new ApolloError("Logout is not implemented on the server side. Simply discard the JWT on the client side.");
};
