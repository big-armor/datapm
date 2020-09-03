import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { GraphQLField, defaultFieldResolver } from "graphql";
import { Context } from "../context";

export class ValidUsernameDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;

        field.resolve = function (source, args, context: Context, info) {
    
            const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;

            const username: string | undefined = args.username || args.value.username || undefined;
    
            if(username === undefined)
                throw new ValidationError(`Username must be provided`);

            if(username.length == 0)
                throw new ValidationError(`Username must be provided`);    

            if(username.length > 39)
                throw new ValidationError(`Username must be less than 39 characters`);


            if(username.match(regex) == null)
                throw new ValidationError("Username must contain only alpha-numeric characters or hyphens, can not begin or end with a hyphen.");    

            return resolve.apply(this, [source, args, context, info]);
            
    
        };
    }
}