import { AuthenticationError } from "apollo-server";
import { AuthenticatedContext } from "../context";
import { AUTHENTICATION_ERROR, CreateUserInput, UpdateMyPasswordInput, UpdateUserInput } from "../generated/graphql";
import { UserRepository } from "../repository/UserRepository";
import { createJwt } from "../util/jwt";
import { hashPassword } from "../util/PasswordUtil";
import { getGraphQlRelationName } from "../util/relationNames";

export const createMe = async (
	_0: any,
	{ value }: { value: CreateUserInput },
	context: AuthenticatedContext,
	info: any
) => {
	const user = await context.connection.manager.getCustomRepository(UserRepository).createUser({
		value,
		relations: getGraphQlRelationName(info)
	});

	return createJwt(user);
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
		throw new AuthenticationError(AUTHENTICATION_ERROR.USER_NOT_FOUND);
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
