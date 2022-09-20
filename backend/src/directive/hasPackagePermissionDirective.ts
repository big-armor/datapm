import { SchemaDirectiveVisitor, AuthenticationError, ForbiddenError, ApolloError } from "apollo-server";
import {
    GraphQLObjectType,
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLInterfaceType,
    EnumValueNode
} from "graphql";
import { AuthenticatedContext, Context } from "../context";
import { Permission, PackageIdentifier, PackageIdentifierInput } from "../generated/graphql";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";
import { UserEntity } from "../entity/UserEntity";
import { getPackageFromCacheOrDbOrFail } from "../resolvers/PackageResolver";
import { getCatalogPackagePermissionsFromCacheOrDb } from "../resolvers/UserCatalogPermissionResolver";
import { isAuthenticatedContext } from "../util/contextHelpers";
import { GroupPackagePermissionRepository } from "../repository/GroupPackagePermissionRepository";
import { PackageEntity } from "../entity/PackageEntity";

export async function resolvePackagePermissions(
    context: Context,
    identifier: PackageIdentifierInput,
    user?: UserEntity
): Promise<Permission[]> {
    const packageEntity = await getPackageFromCacheOrDbOrFail(context, identifier);
    return resolvePackagePermissionsForEntity(context, packageEntity, user);
}

export async function resolvePackagePermissionsForEntity(
    context: Context,
    packageEntity: PackageEntity,
    user?: UserEntity
): Promise<Permission[]> {
    const permissions: Permission[] = [];

    if (packageEntity.isPublic) {
        permissions.push(Permission.VIEW);
    }

    if (user == null) {
        return permissions;
    }

    const userPermissionPromiseFunction = async () => {
        const permissions: Permission[] = [];

        const userPermission = await context.connection
            .getCustomRepository(PackagePermissionRepository)
            .findPackagePermissions({
                packageId: packageEntity.id,
                userId: user.id
            });

        if (userPermission != null) {
            userPermission.permissions.forEach((p) => {
                if (!permissions.includes(p)) {
                    permissions.push(p);
                }
            });
        }

        const groupPermisions = await context.connection
            .getCustomRepository(GroupPackagePermissionRepository)
            .getPackagePermissionsByUser({
                packageId: packageEntity.id,
                userId: user.id
            });

        if (groupPermisions != null) {
            for (const groupPermission of groupPermisions) {
                for (const permission of groupPermission.permissions) {
                    if (!permissions.includes(permission)) {
                        permissions.push(permission);
                    }
                }
            }
        }

        return permissions;
    };

    const packagePermissions =
        (await context.cache.loadPackagePermissionsById(packageEntity.id, userPermissionPromiseFunction)) || [];

    const catalogPermissions = await getCatalogPackagePermissionsFromCacheOrDb(
        context,
        packageEntity.catalogId,
        user.id
    );

    const allPermissions = permissions.concat(catalogPermissions).concat(packagePermissions);

    return allPermissions.filter((v, i, a) => a.indexOf(v) === i);
}

export async function hasPackagePermissionForEntity(
    permission: Permission,
    context: Context,
    packageEntity: PackageEntity
): Promise<boolean> {
    const isAuthenicatedContext = isAuthenticatedContext(context);

    const permissions = await resolvePackagePermissionsForEntity(
        context,
        packageEntity,
        isAuthenicatedContext ? (context as AuthenticatedContext).me : undefined
    );

    return permissions.includes(permission);
}

export async function hasPackagePermission(
    permission: Permission,
    context: Context,
    identifier: PackageIdentifierInput
): Promise<boolean> {
    const isAuthenicatedContext = isAuthenticatedContext(context);

    // Check that the package exists
    const permissions = await resolvePackagePermissions(
        context,
        identifier,
        isAuthenicatedContext ? (context as AuthenticatedContext).me : undefined
    );

    return permissions.includes(permission);
}

export async function hasPackagePermissionOrFail(
    permission: Permission,
    context: Context,
    identifier: PackageIdentifierInput
): Promise<true> {
    const hasPermissionBoolean = await hasPackagePermission(permission, context, identifier);

    if (hasPermissionBoolean) {
        return true;
    }

    const isAuthenicatedContext = isAuthenticatedContext(context);

    if (!isAuthenicatedContext) {
        throw new AuthenticationError("NOT_AUTHENTICATED");
    }

    throw new ForbiddenError("NOT_AUTHORIZED");
}

export class HasPackagePermissionDirective extends SchemaDirectiveVisitor {
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
        const permission = (argument.astNode?.directives
            ?.find((d) => d.name.value === "hasPackagePermission")
            ?.arguments?.find((a) => a.name.value === "permission")?.value as EnumValueNode).value as Permission;

        details.field.resolve = async function (source, args, context: AuthenticatedContext, info) {
            const identifier: PackageIdentifierInput = args[argument.name];
            await hasPackagePermissionOrFail(permission, context, identifier);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<unknown, Context>): void {
        const { resolve = defaultFieldResolver } = field;
        const permission: Permission = this.args.permission;
        field.resolve = async function (source, args, context: Context, info) {
            const identifier: PackageIdentifier | undefined = args.identifier || args.packageIdentifier || undefined;

            if (identifier === undefined) throw new ApolloError(`INTERNAL_ERROR`);

            await hasPackagePermissionOrFail(permission, context, identifier);
            return resolve.apply(this, [source, args, context, info]);
        };
    }
}
