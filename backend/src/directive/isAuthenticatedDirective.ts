import { SchemaDirectiveVisitor, AuthenticationError } from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver } from "graphql";
import { Context } from "../context";

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

            return resolve.apply(this, [source, args, context, info]);
        };
    }
}
