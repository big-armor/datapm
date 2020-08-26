import { Permission } from "../generated/graphql";

export function allPermissions(): Permission[] {
    return [
        Permission.Create,
        Permission.Delete,
        Permission.Edit,
        Permission.Manage,
        Permission.View
    ]
}