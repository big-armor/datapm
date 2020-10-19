import { SchemaDirectiveVisitor, AuthenticationError, ForbiddenError, UserInputError } from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver } from "graphql";
import { Context } from "../context";
import { Permission } from "../generated/graphql";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { CatalogRepository } from "../repository/CatalogRepository";

export class HasCatalogPermissionDirective extends SchemaDirectiveVisitor {
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
            const catalogSlug: string | undefined =
                args.catalogSlug ||
                (args.value && args.value.catalogSlug) ||
                (args.identifier && args.identifier.catalogSlug) ||
                undefined;

            if (catalogSlug === undefined) throw new Error("No catalog slug defined in the request");

            // Check that the requested catalog exists
            const catalog = await context.connection
                .getCustomRepository(CatalogRepository)
                .findCatalogBySlug({ slug: catalogSlug });

            if (catalog == null) {
                throw new UserInputError("CATALOG_NOT_FOUND");
            }

            if (permission == Permission.VIEW && catalog.isPublic) {
                return resolve.apply(this, [source, args, context, info]);
            }

            if (!context.me) throw new AuthenticationError("NOT_AUTHENTICATED");

            const catalogPermission = await context.connection
                .getCustomRepository(UserCatalogPermissionRepository)
                .findOne({
                    catalogId: catalog.id,
                    userId: context.me.id
                });

            if (catalogPermission == null || catalogPermission?.permissions.indexOf(permission) === -1)
                throw new ForbiddenError("NOT_AUTHORIZED");

            return resolve.apply(this, [source, args, context, info]);
        };
    }
}
