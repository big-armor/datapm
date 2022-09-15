import { SchemaDirectiveVisitor, AuthenticationError, ForbiddenError } from "apollo-server";
import {
    GraphQLObjectType,
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLInterfaceType,
    EnumValueNode
} from "graphql";
import { AuthenticatedContext, Context } from "../context";
import { CatalogEntity } from "../entity/CatalogEntity";
import { UserEntity } from "../entity/UserEntity";
import { CatalogIdentifierInput, Permission } from "../generated/graphql";
import { getCatalogFromCacheOrDbOrFail } from "../resolvers/CatalogResolver";
import { getCatalogPermissionsFromCacheOrDb } from "../resolvers/UserCatalogPermissionResolver";
import { isAuthenticatedAsAdmin, isAuthenticatedContext } from "../util/contextHelpers";

export const buildUnclaimedCatalogPermissions = (context: Context): Permission[] => {
    const permissions = [Permission.VIEW];
    if (isAuthenticatedAsAdmin(context)) {
        permissions.push(Permission.EDIT, Permission.MANAGE);
    }
    return permissions;
};

export async function resolveCatalogPermissions(
    context: Context,
    identifier: CatalogIdentifierInput,
    user?: UserEntity
): Promise<Permission[]> {
    const catalog = await getCatalogFromCacheOrDbOrFail(context, identifier);
    return resolveCatalogPermissionsForEntity(context, catalog, user);
}

export async function resolveCatalogPermissionsForEntity(
    context: Context,
    catalog: CatalogEntity,
    user?: UserEntity
): Promise<Permission[]> {
    const permissions: Permission[] = [];

    if (catalog.isPublic) {
        permissions.push(Permission.VIEW);
    }

    if (user == null) {
        return permissions;
    }

    const userPermission = await getCatalogPermissionsFromCacheOrDb(context, catalog.id, user.id);

    const allPermissions = permissions.concat(userPermission);

    return allPermissions.filter((v, i, a) => a.indexOf(v) === i);
}

export async function hasCatalogPermission(
    permission: Permission,
    context: Context,
    identifier: CatalogIdentifierInput
): Promise<boolean> {
    const isAuthenicatedContext = isAuthenticatedContext(context);

    // Check that the package exists
    const permissions = await resolveCatalogPermissions(
        context,
        identifier,
        isAuthenicatedContext ? (context as AuthenticatedContext).me : undefined
    );

    return permissions.includes(permission);
}

export async function hasCatalogPermissionOrFail(
    permission: Permission,
    context: Context,
    identifier: CatalogIdentifierInput
): Promise<true> {
    const hasPermissionBoolean = await hasCatalogPermission(permission, context, identifier);

    if (hasPermissionBoolean) {
        return true;
    }

    const isAuthenicatedContext = isAuthenticatedContext(context);

    if (!isAuthenicatedContext) {
        throw new AuthenticationError("NOT_AUTHENTICATED");
    }

    throw new ForbiddenError("NOT_AUTHORIZED");
}

export class HasCatalogPermissionDirective extends SchemaDirectiveVisitor {
    visitObject(object: GraphQLObjectType): void {
        const fields = object.getFields();
        for (const field of Object.values(fields)) {
            this.visitFieldDefinition(field);
        }
    }

    visitArgumentDefinition(
        argument: GraphQLArgument,
        details: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        const permission = (argument.astNode?.directives
            ?.find((d) => d.name.value === "hasCatalogPermission")
            ?.arguments?.find((a) => a.name.value === "permission")?.value as EnumValueNode).value as Permission;
        details.field.resolve = async function (source, args, context: Context, info) {
            const identifier: CatalogIdentifierInput = args[argument.name];
            await self.validatePermission(context, identifier.catalogSlug, permission);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<unknown, Context>): void {
        const { resolve = defaultFieldResolver } = field;
        const permission: Permission = this.args.permission;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        field.resolve = async function (source, args, context: Context, info) {
            const catalogSlug: string | undefined =
                args.catalogSlug ||
                (args.value && args.value.catalogSlug) ||
                (args.identifier && args.identifier.catalogSlug) ||
                (args.catalogIdentifier && args.catalogIdentifier.catalogSlug) ||
                undefined;

            if (catalogSlug === undefined) {
                throw new Error("No catalog slug defined in the request");
            }

            await self.validatePermission(context, catalogSlug, permission);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    private async validatePermission(context: Context, catalogSlug: string, permission: Permission) {
        const catalog = await getCatalogFromCacheOrDbOrFail(context, { catalogSlug });
        const permissions = await this.getUserCatalogPermissions(context, catalog);
        if (permissions.includes(permission)) {
            return;
        }

        if (!isAuthenticatedContext(context)) {
            throw new AuthenticationError(`NOT_AUTHENTICATED`);
        }

        throw new ForbiddenError("NOT_AUTHORIZED");
    }

    private async getUserCatalogPermissions(context: Context, catalog: CatalogEntity): Promise<Permission[]> {
        if (catalog.unclaimed) {
            return buildUnclaimedCatalogPermissions(context);
        } else {
            if (isAuthenticatedContext(context)) {
                const authenticatedContext = context as AuthenticatedContext;
                return await resolveCatalogPermissionsForEntity(context, catalog, authenticatedContext.me);
            } else {
                return await resolveCatalogPermissionsForEntity(context, catalog);
            }
        }
    }
}
