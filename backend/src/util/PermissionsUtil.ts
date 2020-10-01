import { Permission } from "../generated/graphql";

export function allPermissions(): Permission[] {
    return [
        Permission.CREATE,
        Permission.DELETE,
        Permission.EDIT,
        Permission.MANAGE,
        Permission.VIEW
    ]
}