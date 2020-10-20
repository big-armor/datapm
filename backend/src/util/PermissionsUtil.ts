import { Permission } from "../generated/graphql";

export function allPermissions(): Permission[] {
    return [Permission.EDIT, Permission.MANAGE, Permission.VIEW];
}
