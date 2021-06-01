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
import { getPackageFromCacheOrDb } from "../resolvers/PackageResolver";
import { UserPackagePermissionEntity } from "../entity/UserPackagePermissionEntity";
import { getCatalogPermissionsFromCacheOrDb } from "../resolvers/UserCatalogPermissionResolver";

export async function resolvePackagePermissions(
    context: Context,
    identifier: PackageIdentifierInput,
    user?: UserEntity
): Promise<Permission[]> {
    const permissions: Permission[] = [];

    const packageEntity = await getPackageFromCacheOrDb(context, identifier);
    if (packageEntity.isPublic) {
        permissions.push(Permission.VIEW);
    }

    if (user == null) {
        return permissions;
    }

    const userPermissionPromiseFunction = () =>
        context.connection.getCustomRepository(PackagePermissionRepository).findPackagePermissions({
            packageId: packageEntity.id,
            userId: user.id
        }) as Promise<UserPackagePermissionEntity>;
    const userPermission = await context.cache.loadPackagePermissionsById(
        packageEntity.id,
        userPermissionPromiseFunction
    );

    if (userPermission != null) {
        userPermission.permissions.forEach((p) => {
            if (!permissions.includes(p)) {
                permissions.push(p);
            }
        });
    }

    const catalogPermissions = await getCatalogPermissionsFromCacheOrDb(context, packageEntity.catalogId, user!.id);
    if (catalogPermissions != null) {
        catalogPermissions.packagePermission.forEach((p) => {
            if (!permissions.includes(p)) {
                permissions.push(p);
            }
        });
    }

    return permissions;
}

async function hasPermission(
    permission: Permission,
    context: Context,
    identifier: PackageIdentifierInput
): Promise<void> {
    // Check that the package exists
    const permissions = await resolvePackagePermissions(context, identifier, context.me);

    if (permissions.includes(permission)) {
        return;
    }

    if (context.me == null) {
        throw new AuthenticationError("NOT_AUTHENTICATED");
    }

    throw new ForbiddenError("NOT_AUTHORIZED");
}

export class HasPackagePermissionDirective extends SchemaDirectiveVisitor {
    visitObject(object: GraphQLObjectType) {
        const fields = object.getFields();
        for (let field of Object.values(fields)) {
            this.visitFieldDefinition(field);
        }
    }

    visitArgumentDefinition(
        argument: GraphQLArgument,
        details: {
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        const permission = (argument
            .astNode!.directives!.find((d) => d.name.value == "hasPackagePermission")!
            .arguments!.find((a) => a.name.value == "permission")!.value as EnumValueNode).value as Permission;

        details.field.resolve = async function (source, args, context: AuthenticatedContext, info) {
            const identifier: PackageIdentifierInput = args[argument.name];
            await hasPermission(permission, context, identifier);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        const permission: Permission = this.args.permission;
        field.resolve = async function (source, args, context: Context, info) {
            const identifier: PackageIdentifier | undefined = args.identifier || args.packageIdentifier || undefined;

            if (identifier === undefined) throw new ApolloError(`INTERNAL_ERROR`);

            await hasPermission(permission, context, identifier);
            return resolve.apply(this, [source, args, context, info]);
        };
    }
}
