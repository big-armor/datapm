import {
    SchemaDirectiveVisitor,
    AuthenticationError,
    ForbiddenError,
    UserInputError,
    ApolloError
} from "apollo-server";
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

async function hasPermission(
    permission: Permission,
    context: Context,
    identifier: PackageIdentifierInput
): Promise<void> {
    // Check that the package exists
    const packageEntity = await context.connection.getCustomRepository(PackageRepository).findPackage({
        identifier,
        relations: ["catalog"]
    });

    if (packageEntity == null) throw new UserInputError("PACKAGE_NOT_FOUND");

    if (permission == Permission.VIEW && packageEntity.isPublic === true && packageEntity.catalog.isPublic === true)
        return;

    if (context.me === undefined) {
        throw new AuthenticationError(`NOT_AUTHENTICATED`);
    }

    const packagePermissions = await context.connection
        .getCustomRepository(PackagePermissionRepository)
        .findPackagePermissions({
            packageId: packageEntity.id,
            userId: context.me?.id
        });

    if (packagePermissions === undefined) throw new ForbiddenError(`NOT_AUTHORIZED`);

    let foundPackagePermission = false;

    for (let p of packagePermissions.permissions) {
        if (p === permission) {
            foundPackagePermission = true;
            continue;
        }
    }

    if (!foundPackagePermission) throw new ForbiddenError(`NOT_AUTHORIZED`);

    const catalogPermissions = await context.connection
        .getCustomRepository(UserCatalogPermissionRepository)
        .findCatalogPermissions({
            catalogId: packageEntity.catalogId,
            userId: context.me?.id
        });

    if (catalogPermissions === undefined) throw new ForbiddenError(`NOT_AUTHORIZED`);

    for (let c of catalogPermissions.permissions) {
        if (c === Permission.VIEW) return;
    }

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
