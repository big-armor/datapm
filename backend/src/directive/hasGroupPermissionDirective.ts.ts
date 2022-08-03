import { SchemaDirectiveVisitor, AuthenticationError, ForbiddenError } from "apollo-server";
import {
    GraphQLObjectType,
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLInterfaceType,
    EnumValueNode
} from "graphql";
import { AuthenticatedContext, Context } from "../context";
import { CatalogEntity } from "../entity/CatalogEntity";
import { GroupEntity } from "../entity/GroupEntity";
import { UserEntity } from "../entity/UserEntity";
import { CatalogIdentifierInput, Permission } from "../generated/graphql";
import { getCatalogFromCacheOrDbOrFail } from "../resolvers/CatalogResolver";
import { getGroupFromCacheOrDbBySlugOrFail, getGroupPermissionsFromCacheOrDb } from "../resolvers/GroupResolver";
import { isAuthenticatedContext } from "../util/contextHelpers";

export async function resolveGroupPermissions(
    context: Context,
    groupSlug: string,
    user?: UserEntity
) {
    const group = await getGroupFromCacheOrDbBySlugOrFail(context, context.connection, groupSlug);
    return resolveGroupPermissionsForEntity(context, group, user);
}

export async function resolveGroupPermissionsForEntity(context: Context, group: GroupEntity, user?: UserEntity) {
    const permissions: Permission[] = [];

    if (user == null) {
        return permissions;
    }

    const userPermission = await getGroupPermissionsFromCacheOrDb(context, group.id, user!.id);

    return permissions.concat(userPermission);
}
export class HasGroupPermissionDirective extends SchemaDirectiveVisitor {
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
            .astNode!.directives!.find((d) => d.name.value == "hasGroupPermission")!
            .arguments!.find((a) => a.name.value == "permission")!.value as EnumValueNode).value as Permission;
        details.field.resolve = async function (source, args, context: Context, info) {
            const groupSlug: string = args[argument.name];
            await self.validatePermission(context, groupSlug, permission);
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
                (args.catalogIdentifier && args.catalogIdentifier.catalogSlug) ||
                undefined;

            if (catalogSlug === undefined) {
                throw new Error("No catalog slug defined in the request");
            }

            await self.validatePermission(context, catalogSlug, permission);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    private async validatePermission(context: Context, groupSlug: string, permission: Permission) {
        const group = await getGroupFromCacheOrDbBySlugOrFail(context, context.connection, groupSlug );
        const permissions = await this.getUserGroupPermissions(context, group);
        if (permissions.includes(permission)) {
            return;
        }

        if (!isAuthenticatedContext(context)) {
            throw new AuthenticationError(`NOT_AUTHENTICATED`);
        }

        throw new ForbiddenError("NOT_AUTHORIZED");
    }

    private async getUserGroupPermissions(context: Context, group: GroupEntity): Promise<Permission[]> {

        if(isAuthenticatedContext(context)) {
            const authenticatedContext = context as AuthenticatedContext;
            return await resolveGroupPermissionsForEntity(context, group, authenticatedContext.me);
        } else {
            return [];
        }
        
    }
}
