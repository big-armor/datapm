import { SchemaDirectiveVisitor, AuthenticationError, ValidationError } from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver } from "graphql";
import { AuthenticatedContext, Context } from "../context";
import { AUTHENTICATION_ERROR, UserStatus } from "../generated/graphql";
import { isAuthenticatedContext } from "../util/contextHelpers";

export class IsAuthenticatedDirective extends SchemaDirectiveVisitor {
    visitObject(object: GraphQLObjectType): void {
        const fields = object.getFields();
        for (const field of Object.values(fields)) {
            this.visitFieldDefinition(field);
        }
    }

    visitFieldDefinition(field: GraphQLField<unknown, Context>): void {
        const { resolve = defaultFieldResolver } = field;
        field.resolve = function (source, args, context: Context, info) {
            if (!isAuthenticatedContext(context)) throw new AuthenticationError("NOT_AUTHENTICATED");

            const authenicatedContext = context as AuthenticatedContext;

            if (!authenicatedContext.me.emailVerified) {
                throw new ValidationError("EMAIL_ADDRESS_NOT_VERIFIED");
            }

            if (UserStatus.SUSPENDED === authenicatedContext.me.status) {
                throw new ValidationError(AUTHENTICATION_ERROR.ACCOUNT_SUSPENDED);
            }

            return resolve.apply(this, [source, args, context, info]);
        };
    }
}
