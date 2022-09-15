import { SchemaDirectiveVisitor, AuthenticationError, ForbiddenError } from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver, GraphQLArgument, GraphQLInterfaceType } from "graphql";
import { AuthenticatedContext, Context } from "../context";
import { GroupRepository } from "../repository/GroupRepository";
import { isAuthenticatedContext } from "../util/contextHelpers";

export class IsAdminDirective extends SchemaDirectiveVisitor {
    visitObject(object: GraphQLObjectType): void {
        const fields = object.getFields();
        for (const field of Object.values(fields)) {
            this.visitFieldDefinition(field);
        }
    }

    public visitFieldDefinition(field: GraphQLField<unknown, Context>): void {
        const { resolve = defaultFieldResolver } = field;
        field.resolve = function (source, args, context: Context, info) {
            if (!isAuthenticatedContext(context)) throw new AuthenticationError("NOT_AUTHENTICATED");

            const authenicatedContext = context as AuthenticatedContext;

            if (!authenicatedContext.isAdmin) throw new ForbiddenError("NOT_AUTHORIZED");

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    public visitArgumentDefinition(
        argument: GraphQLArgument,
        details: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        details.field.resolve = function (source, args, context: Context, info) {
            if (args[argument.name] !== undefined) {
                // argument was specified. check for isAdmin
                if (!isAuthenticatedContext(context)) throw new AuthenticationError("NOT_AUTHENTICATED");

                const authenicatedContext = context as AuthenticatedContext;

                if (!authenicatedContext.isAdmin) throw new ForbiddenError("NOT_AUTHORIZED");
            }

            return resolve.apply(this, [source, args, context, info]);
        };
    }
}
