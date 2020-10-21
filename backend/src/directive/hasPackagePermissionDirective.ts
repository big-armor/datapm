import {
    SchemaDirectiveVisitor,
    AuthenticationError,
    ForbiddenError,
    UserInputError,
    ApolloError
} from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver } from "graphql";
import { Context } from "../context";
import { Permission, PackageIdentifier } from "../generated/graphql";
import { PackageRepository } from "../repository/PackageRepository";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";

async function hasPermission(
    permission: Permission,
    context: Context,
    identifier: PackageIdentifier
): Promise<boolean> {
    // Check that the package exists
    const packageEntity = await context.connection.getCustomRepository(PackageRepository).findPackage({
        identifier,
        includeActiveOnly: false
    });

    if (packageEntity == null) throw new UserInputError("PACKAGE_NOT_FOUND");

    if (permission == Permission.VIEW && packageEntity.isPublic === true) return true;

    if (context.me === undefined) {
        throw new AuthenticationError(`NOT_AUTHENTICATED`);
    }

    const packagePermissions = await context.connection
        .getCustomRepository(PackagePermissionRepository)
        .findPackagePermissions({
            packageId: packageEntity.id,
            userId: context.me?.id
        });

    if (packagePermissions === undefined) return false;

    for (let p of packagePermissions.permissions) {
        if (p === permission) return true;
    }

    return false;
}

export class HasPackagePermissionDirective extends SchemaDirectiveVisitor {
    visitObject(object: GraphQLObjectType) {
        const fields = object.getFields();
        for (let field of Object.values(fields)) {
            this.visitFieldDefinition(field);
        }
    }

    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        const permission: Permission = this.args.permission;
        field.resolve = async function (source, args, context: Context, info) {
            const identifier: PackageIdentifier | undefined = args.identifier || args.packageIdentifier || undefined;

            if (identifier === undefined) throw new ApolloError(`INTERNAL_ERROR`);

            let hasPermissionBoolean = await hasPermission(permission, context, identifier);
            if (hasPermissionBoolean) {
                return resolve.apply(this, [source, args, context, info]);
            } else {
                throw new ForbiddenError(`NOT_AUTHORIZED`);
            }
        };
    }
}
