import { SchemaDirectiveVisitor, AuthenticationError } from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver } from "graphql";
import { AuthenticatedContext, Context } from "../context";
import { UserRepository } from "../repository/UserRepository";
import { isAuthenticatedContext } from "../util/contextHelpers";

export class IsUserOrAdminDirective extends SchemaDirectiveVisitor {
    visitObject(object: GraphQLObjectType): void {
        const fields = object.getFields();
        for (const field of Object.values(fields)) {
            this.visitFieldDefinition(field);
        }
    }

    visitFieldDefinition(field: GraphQLField<unknown, Context>): void {
        const { resolve = defaultFieldResolver } = field;
        field.resolve = function (source, args, context: Context, info) {
            if (!isAuthenticatedContext(context)) throw new AuthenticationError("Not logged in");

            const authenicatedContext = context as AuthenticatedContext;

            const username: string | undefined = args.username || args.value.username || undefined;

            if (username === undefined)
                throw new Error(`Could not identify username in arguments -- this should not happen!`);

            context.connection
                .getCustomRepository(UserRepository)
                .findUserByUserName({ username: username })
                .then((user) => {
                    if (user === undefined) throw new Error(`Could not find user with username ${username}`);

                    if (authenicatedContext.me.id !== user.id)
                        throw new Error(`You are trying to alter a user that is not you`);

                    return resolve.apply(this, [source, args, context, info]);
                });
        };
    }
}
