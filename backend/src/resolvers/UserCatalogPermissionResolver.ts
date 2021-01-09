import { AuthenticatedContext } from "../context";
import { CatalogIdentifierInput } from "../generated/graphql";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";

export const deleteUserCatalogPermissions = async (
    _0: any,
    { identifier, username }: { identifier: CatalogIdentifierInput; username: string },
    context: AuthenticatedContext
) => {
    return context.connection.getCustomRepository(UserCatalogPermissionRepository).deleteUserCatalogPermissions({
        identifier,
        username
    });
};
