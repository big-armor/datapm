import { SchemaDirectiveVisitor, AuthenticationError } from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver } from "graphql";
import { Context } from "../context";
import { UserRepository } from "../repository/UserRepository";

export class IsUserOrAdminDirective extends SchemaDirectiveVisitor {
    visitObject(object: GraphQLObjectType) {
        const fields = object.getFields();
        for (let field of Object.values(fields)) {
            this.visitFieldDefinition(field);
        }
    }

    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        field.resolve = function (source, args, context: Context, info) {
            if (!context.me) throw new AuthenticationError("Not logged in");

            const username: string | undefined = args.username || args.value.username || undefined;

            if (username === undefined)
                throw new Error(`Could not identify username in arguments -- this should not happen!`);

            return context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: username })
                .then((user) => {
                    if (context.me?.id !== user.id) throw new Error(`You are trying to alter a user that is not you`);

                    return resolve.apply(this, [source, args, context, info]);
                });
        };
    }
}
