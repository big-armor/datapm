import { SchemaDirectiveVisitor, ForbiddenError, ApolloError, AuthenticationError } from "apollo-server";
import {
    GraphQLObjectType,
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLInterfaceType,
    EnumValueNode
} from "graphql";
import { AuthenticatedContext, Context } from "../context";
import { CollectionEntity } from "../entity/CollectionEntity";
import { UserEntity } from "../entity/UserEntity";
import { CollectionIdentifierInput, Permission } from "../generated/graphql";
import { getCollectionFromCacheOrDbOrFail } from "../resolvers/CollectionResolver";
import { getCollectionPermissionsFromCacheOrDb } from "../resolvers/UserCollectionPermissionResolver";
import { isAuthenticatedContext } from "../util/contextHelpers";

export async function resolveCollectionPermissions(
    context: Context,
    identifier: CollectionIdentifierInput,
    user?: UserEntity
): Promise<Permission[]> {
    const collectionEntity = await getCollectionFromCacheOrDbOrFail(
        context,
        context.connection,
        identifier.collectionSlug
    );
    return resolveCollectionPermissionsForEntity(context, collectionEntity, user);
}

export async function resolveCollectionPermissionsForEntity(
    context: Context,
    collectionEntity: CollectionEntity,
    user?: UserEntity
): Promise<Permission[]> {
    const permissions: Permission[] = [];

    if (collectionEntity.isPublic) {
        permissions.push(Permission.VIEW);
    }

    if (user == null) {
        return permissions;
    }

    const userPermission = await getCollectionPermissionsFromCacheOrDb(context, collectionEntity);

    const allPermissions = permissions.concat(userPermission);

    return allPermissions.filter((v, i, a) => a.indexOf(v) === i);
}

export async function hasCollectionPermission(
    permission: Permission,
    context: Context,
    identifier: CollectionIdentifierInput
): Promise<boolean> {
    const isAuthenicatedContext = isAuthenticatedContext(context);

    // Check that the package exists
    const permissions = await resolveCollectionPermissions(
        context,
        identifier,
        isAuthenicatedContext ? (context as AuthenticatedContext).me : undefined
    );

    return permissions.includes(permission);
}

export async function hasCollectionPermissionOrFail(
    permission: Permission,
    context: Context,
    identifier: CollectionIdentifierInput
): Promise<true> {
    const hasPermissionBoolean = await hasCollectionPermission(permission, context, identifier);

    if (hasPermissionBoolean) {
        return true;
    }

    const isAuthenicatedContext = isAuthenticatedContext(context);

    if (!isAuthenicatedContext) {
        throw new AuthenticationError("NOT_AUTHENTICATED");
    }

    throw new ForbiddenError("NOT_AUTHORIZED");
}
export class HasCollectionPermissionDirective extends SchemaDirectiveVisitor {
    public visitObject(object: GraphQLObjectType): void {
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
            ?.find((d) => d.name.value === "hasCollectionPermission")
            ?.arguments?.find((a) => a.name.value === "permission")?.value as EnumValueNode).value as Permission;
        details.field.resolve = async function (source, args, context: AuthenticatedContext, info) {
            const identifier: CollectionIdentifierInput = args[argument.name];
            await hasCollectionPermissionOrFail(permission, context, identifier);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    public visitFieldDefinition(field: GraphQLField<unknown, AuthenticatedContext>): void {
        const { resolve = defaultFieldResolver } = field;
        const permission: Permission = this.args.permission;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
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

            await hasCollectionPermissionOrFail(permission, context, { collectionSlug });

            return resolve.apply(this, [source, args, context, info]);
        };
    }
}
