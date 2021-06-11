import { SchemaDirectiveVisitor, ForbiddenError, ApolloError } from "apollo-server";
import {
    GraphQLObjectType,
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLInterfaceType,
    EnumValueNode
} from "graphql";
import { AuthenticatedContext } from "../context";
import { CollectionIdentifierInput, Permission } from "../generated/graphql";
import { CollectionRepository } from "../repository/CollectionRepository";
import { hasCollectionPermissions } from "../resolvers/UserCollectionPermissionResolver";

export class HasCollectionPermissionDirective extends SchemaDirectiveVisitor {
    public visitObject(object: GraphQLObjectType) {
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
            .astNode!.directives!.find((d) => d.name.value == "hasCollectionPermission")!
            .arguments!.find((a) => a.name.value == "permission")!.value as EnumValueNode).value as Permission;
        details.field.resolve = async function (source, args, context: AuthenticatedContext, info) {
            const identifier: CollectionIdentifierInput = args[argument.name];
            await self.validatePermission(context, identifier, permission);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    public visitFieldDefinition(field: GraphQLField<any, any>): void {
        const { resolve = defaultFieldResolver } = field;
        const permission: Permission = this.args.permission;
        const self = this;
        field.resolve = async (source, args, context: AuthenticatedContext, info) => {
            const collectionSlug: string | undefined =
                args.collectionSlug ||
                (args.value && args.value.collectionSlug) ||
                (args.identifier && args.identifier.collectionSlug) ||
                (args.collectionIdentifier && args.collectionIdentifier.collectionSlug) ||
                undefined;

            if (!collectionSlug) {
                throw new ApolloError("COLLECTION_SLUG_REQUIRED");
            }

            await self.validatePermission(context, { collectionSlug }, permission);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    async validatePermission(
        context: AuthenticatedContext,
        identifier: CollectionIdentifierInput,
        permission: Permission
    ) {
        const collection = await context.connection
            .getCustomRepository(CollectionRepository)
            .findCollectionBySlugOrFail(identifier.collectionSlug);

        const hasRequiredPermission = await hasCollectionPermissions(context, collection, permission);
        if (!hasRequiredPermission) {
            throw new ForbiddenError(`NOT_AUTHORIZED`);
        }
    }
}
