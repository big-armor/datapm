import { SchemaDirectiveVisitor, AuthenticationError, ForbiddenError, UserInputError } from "apollo-server";
import {
    GraphQLObjectType,
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLInterfaceType,
    EnumValueNode
} from "graphql";
import { Context } from "../context";
import { CatalogIdentifierInput, Permission } from "../generated/graphql";
import { UserCatalogPermissionRepository } from "../repository/CatalogPermissionRepository";
import { CatalogRepository } from "../repository/CatalogRepository";

export class HasCatalogPermissionDirective extends SchemaDirectiveVisitor {
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
            .astNode!.directives!.find((d) => d.name.value == "hasCatalogPermission")!
            .arguments!.find((a) => a.name.value == "permission")!.value as EnumValueNode).value as Permission;
        details.field.resolve = async function (source, args, context: Context, info) {
            const identifier: CatalogIdentifierInput = args[argument.name];
            await self.validatePermission(context, identifier.catalogSlug, permission);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        const permission: Permission = this.args.permission;
        const self = this;
        field.resolve = async function (source, args, context: Context, info) {
            const catalogSlug: string | undefined =
                args.catalogSlug ||
                (args.value && args.value.catalogSlug) ||
                (args.identifier && args.identifier.catalogSlug) ||
                undefined;

            if (catalogSlug === undefined) throw new Error("No catalog slug defined in the request");

            await self.validatePermission(context, catalogSlug, permission);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    async validatePermission(context: Context, catalogSlug: string, permission: Permission) {
        // Check that the requested catalog exists
        const catalog = await context.connection
            .getCustomRepository(CatalogRepository)
            .findCatalogBySlug({ slug: catalogSlug });

        if (catalog == null) {
            throw new UserInputError("CATALOG_NOT_FOUND");
        }

        if (permission == Permission.VIEW && catalog.isPublic) {
            return;
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
    }
}
