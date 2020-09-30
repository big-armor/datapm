import { AuthenticatedContext } from "../context"
import { CreateUserInput, UpdateUserInput } from "../generated/graphql";
import { UserRepository } from "../repository/UserRepository";
import { createJwt } from "../util/jwt";
import { getGraphQlRelationName } from "../util/relationNames";

export const createMe = async (
    _0: any,
    { value }: { value: CreateUserInput },
    context: AuthenticatedContext,
    info: any) => {
    const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .createUser({
            value,
            relations: getGraphQlRelationName(info),
        });

    return createJwt(user);
}

export const updateMe = async (
    _0: any,
    { value }: { value: UpdateUserInput },
    context: AuthenticatedContext,
    info: any) => {
    return await context.connection.manager
        .getCustomRepository(UserRepository)
        .updateUser({
            username: context.me.username,
            value,
            relations: getGraphQlRelationName(info),
        })
}

export const disableMe = async (
    _0: any,
    {},
    context: AuthenticatedContext,
    info: any) => {
    return await context.connection.manager
        .getCustomRepository(UserRepository)
        .markUserActiveStatus({
            username: context.me.username,
            active: false,
            relations: getGraphQlRelationName(info),
        });
}