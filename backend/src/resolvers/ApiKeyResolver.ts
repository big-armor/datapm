import { ValidationError } from "apollo-server";
import { GraphQLResolveInfo } from "graphql";
import { AuthenticatedContext } from "../context";
import { APIKeyEntity } from "../entity/APIKeyEntity";
import { APIKey, APIKeyWithSecret, AUTHENTICATION_ERROR, CreateAPIKeyInput, Scope } from "../generated/graphql";
import { APIKeyRepository } from "../repository/APIKeyRepository";
import { UserRepository } from "../repository/UserRepository";
import { getGraphQlRelationName } from "../util/relationNames";
import { sendAPIKeyCreatedEmail } from "../util/smtpUtil";

export const createAPIKey = async (
    _0: unknown,
    { value }: { value: CreateAPIKeyInput },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<APIKeyWithSecret> => {
    const user = await context.connection.manager.getCustomRepository(UserRepository).findUser({
        username: context.me.username
    });

    if (!user) {
        throw new ValidationError(AUTHENTICATION_ERROR.WRONG_CREDENTIALS);
    }

    if (
        value.scopes.indexOf(Scope.MANAGE_API_KEYS) === -1 ||
        value.scopes.indexOf(Scope.MANAGE_PRIVATE_ASSETS) === -1 ||
        value.scopes.indexOf(Scope.READ_PRIVATE_ASSETS) === -1
    )
        throw new ValidationError("ALL_SCOPES_REQUIRED");

    const existingAPIKeyLabel = await context.connection.manager
        .getCustomRepository(APIKeyRepository)
        .findByUser(context.me.id);

    if (existingAPIKeyLabel != null) {
        for (const apiKey of existingAPIKeyLabel) {
            if (apiKey.label === value.label) throw new ValidationError("APIKEY_LABEL_NOT_AVIALABLE");
        }
    }

    await sendAPIKeyCreatedEmail(user, value.label);

    return context.connection.manager.getCustomRepository(APIKeyRepository).createAPIKey({
        user,
        label: value.label,
        scopes: value.scopes,
        relations: getGraphQlRelationName(info)
    });
};

export const deleteAPIKey = async (
    _0: unknown,
    { id }: { id: string },
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<APIKey> => {
    return await context.connection.manager
        .getCustomRepository(APIKeyRepository)
        .deleteAPIKey({ id, relations: getGraphQlRelationName(info) });
};

export const myAPIKeys = async (_0: unknown, _1: unknown, context: AuthenticatedContext): Promise<APIKeyEntity[]> => {
    const apiKeys = await context.connection.manager.getCustomRepository(APIKeyRepository).findByUser(context.me?.id);

    return apiKeys;
};
