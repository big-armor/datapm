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
import { PackageRepository } from "../repository/PackageRepository";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { UserEntity } from "../entity/UserEntity";
import { buildUnclaimedCatalogPermissions } from "./hasCatalogPermissionDirective";

export async function resolvePackagePermissions(
    context: Context,
    identifier: PackageIdentifierInput,
    user?: UserEntity
): Promise<Permission[]> {
    const permissions: Permission[] = [];

    const packageEntity = await context.connection
        .getCustomRepository(PackageRepository)
        .findPackageOrFail({ identifier });

    if (packageEntity.catalog.unclaimed) {
        return buildUnclaimedCatalogPermissions(context);
    }

    if (packageEntity.isPublic) {
        permissions.push(Permission.VIEW);
    }

    if (user == null) {
        return permissions;
    }

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

    const catalogPermissions = await context.connection
        .getCustomRepository(UserCatalogPermissionRepository)
        .findCatalogPermissions({ catalogId: packageEntity.catalogId, userId: user!.id });

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

    if (permissions.includes(permission)) return;

    if (context.me == null) throw new AuthenticationError(`NOT_AUTHENTICATED`);

    throw new ForbiddenError(`NOT_AUTHORIZED`);
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
        const self = this;
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
