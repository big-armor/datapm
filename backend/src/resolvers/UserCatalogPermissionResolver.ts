import { AuthenticatedContext, Context } from "../context";
import { CatalogIdentifierInput, Permission } from "../generated/graphql";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { CatalogRepository } from "../repository/CatalogRepository";

export const hasCatalogPermissions = async (context: Context, catalogId: number, permission: Permission) => {
    if (permission == Permission.VIEW) {
        const collection = await context.connection.getCustomRepository(CatalogRepository).findOne({ id: catalogId });

        if (collection?.isPublic) return true;
    }

    if (context.me == null) {
        return false;
    }

    return context.connection
        .getCustomRepository(UserCatalogPermissionRepository)
        .hasPermission(context.me.id, catalogId, permission);
};

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
