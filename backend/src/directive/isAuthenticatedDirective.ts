import { SchemaDirectiveVisitor, AuthenticationError, ValidationError } from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver } from "graphql";
import { Context } from "../context";
import { AUTHENTICATION_ERROR, UserStatus } from "../generated/graphql";

export class IsAuthenticatedDirective extends SchemaDirectiveVisitor {
    visitObject(object: GraphQLObjectType) {
        const fields = object.getFields();
        for (let field of Object.values(fields)) {
            this.visitFieldDefinition(field);
        }
    }

    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        field.resolve = function (source, args, context: Context, info) {
            if (!context.me) throw new AuthenticationError("NOT_AUTHENTICATED");

            if (!context.me.emailVerified) {
                throw new ValidationError("EMAIL_ADDRESS_NOT_VERIFIED");
            }

            if (UserStatus.SUSPENDED == context.me.status) {
                throw new ValidationError(AUTHENTICATION_ERROR.ACCOUNT_SUSPENDED);
            }

            return resolve.apply(this, [source, args, context, info]);
        };
    }
}
