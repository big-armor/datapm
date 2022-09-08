import { CurrentUser } from "datapm-client-lib";
import { AuthenticatedContext } from "../context";
import { UserRepository } from "../repository/UserRepository";
import { getUserFromCacheOrDbByUsername } from "./UserResolver";

export const me = async (_0: any, _1: any, context: AuthenticatedContext, info: any): Promise<CurrentUser> => {
    const user = await getUserFromCacheOrDbByUsername(context, context.me.username);

    const userIsAdmin = await context.connection.getCustomRepository(UserRepository).userIsAdmin(user);

    return {
        isAdmin: userIsAdmin,
        user
    };
};
