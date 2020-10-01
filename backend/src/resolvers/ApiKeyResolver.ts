import { AuthenticatedContext } from "../context";
import { APIKey, APIKeyWithSecret, AUTHENTICATION_ERROR, CreateAPIKeyInput } from "../generated/graphql";
import { APIKeyRepository } from "../repository/APIKeyRepository";
import { UserRepository } from "../repository/UserRepository";
import { getGraphQlRelationName } from "../util/relationNames";

export const createAPIKey = async (
    _0: any,
    { value }: { value: CreateAPIKeyInput },
    context: AuthenticatedContext,
    info: any): Promise<APIKeyWithSecret> => {
    const user = await context.connection.manager
        .getCustomRepository(UserRepository)
        .findUser({
            username: context.me.username,
        });

    if (!user) {
        throw new Error(AUTHENTICATION_ERROR.USER_NOT_FOUND);
    }

    return context.connection.manager
        .getCustomRepository(APIKeyRepository)
        .createAPIKey({
            user,
            label: value.label,
            scopes: value.scopes,
            relations: getGraphQlRelationName(info)
        })
}

export const deleteAPIKey = async (
    _0: any,
    { id }: { id: string },
    context: AuthenticatedContext,
    info: any): Promise<APIKey> => {
    return await context.connection.manager
        .getCustomRepository(APIKeyRepository)
        .deleteAPIKey({ id, relations: getGraphQlRelationName(info) });
}