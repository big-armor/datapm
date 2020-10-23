import { SchemaDirectiveVisitor, ForbiddenError, ApolloError } from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver } from "graphql";
import { AuthenticatedContext } from "../context";
import { Permission } from "../generated/graphql";
import { CollectionRepository } from "../repository/CollectionRepository";
import { hasCollectionPermissions } from "../resolvers/UserCollectionPermissionResolver";

export class HasCollectionPermissionDirective extends SchemaDirectiveVisitor {
    public visitObject(object: GraphQLObjectType) {
        const fields = object.getFields();
        for (let field of Object.values(fields)) {
            this.visitFieldDefinition(field);
        }
    }

    public visitFieldDefinition(field: GraphQLField<any, any>): void {
        const { resolve = defaultFieldResolver } = field;
        const permission: Permission = this.args.permission;
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

            const collection = await context.connection
                .getCustomRepository(CollectionRepository)
                .findCollectionBySlugOrFail(collectionSlug);
            if (permission == Permission.VIEW && collection.isPublic) {
                return resolve.apply(this, [source, args, context, info]);
            }

            const hasRequiredPermission = await hasCollectionPermissions(context, collection.id, permission);
            if (!hasRequiredPermission) {
                throw new ForbiddenError(`NOT_AUTHORIZED`);
            }

            return resolve.apply(this, [source, args, context, info]);
        };
    }
}
