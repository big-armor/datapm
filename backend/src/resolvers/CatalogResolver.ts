import { AuthenticatedContext } from "../context";
import { CatalogRepository } from "../repository/CatalogRepository";
import { getGraphQlRelationName } from "../util/relationNames";

export const userCatalogs = async (
    _0: any,
    { username, limit, offSet }: { username: string; limit: number; offSet: number },
    context: AuthenticatedContext,
    info: any
) => {
    const relations = getGraphQlRelationName(info);
    const [searchResponse, count] = await context.connection.manager
        .getCustomRepository(CatalogRepository)
        .userCatalogs({ user: context.me, username, offSet: offSet, limit, relations });

    return {
        hasMore: count - (offSet + limit) > 0,
        catalogs: searchResponse,
        count
    };
};
