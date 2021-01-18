import { Context } from "../context";
import { PackageEntity } from "../entity/PackageEntity";
import { Permission } from "../generated/graphql";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";

export const hasPackagePermissions = async (context: Context, packageId: number, permission: Permission) => {
    if (permission == Permission.VIEW) {
        const collection = await context.connection.getRepository(PackageEntity).findOneOrFail({ id: packageId });
        if (collection?.isPublic) return true;
    }

    if (context.me == null) {
        return false;
    }

    return context.connection
        .getCustomRepository(PackagePermissionRepository)
        .hasPermission(context.me.id, packageId, permission);
};
