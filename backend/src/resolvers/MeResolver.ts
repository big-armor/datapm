import { CurrentUser } from "datapm-client-lib";
import { GraphQLResolveInfo } from "graphql";
import { AuthenticatedContext } from "../context";
import { UserRepository } from "../repository/UserRepository";
import { getUserFromCacheOrDbByUsernameOrFail } from "./UserResolver";

export const me = async (
    _0: unknown,
    _1: unknown,
    context: AuthenticatedContext,
    info: GraphQLResolveInfo
): Promise<CurrentUser> => {
    const user = await getUserFromCacheOrDbByUsernameOrFail(context, context.me.username);

    const userIsAdmin = await context.connection.getCustomRepository(UserRepository).userIsAdmin(user);

    return {
        isAdmin: userIsAdmin,
        user
    };
};
