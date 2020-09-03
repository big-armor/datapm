import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { GraphQLField, defaultFieldResolver } from "graphql";
import { Context } from "../context";

export class ValidPasswordDirective extends SchemaDirectiveVisitor {
    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;

        field.resolve = function (source, args, context: Context, info) {
    
            const regex = /^[0-9@#$%]$/;

            const password: string | undefined = args.username || args.value.username || undefined;
    
            if(password === undefined)
                throw new ValidationError(`Password must be provided`);

            if(password.length == 0)
                throw new ValidationError(`Password must be provided`);    

            if(password.length > 99)
                throw new ValidationError(`Password must be less than 100 characters`);

            if(password.length < 8)
                throw new ValidationError(`Password must be at least 8 characters long`);

            if(password.length < 16
                && password.match(regex) == null) {
                throw new ValidationError(`Passwords less than 16 characters must contain a number or a special character (@#$%)`);
            }

            return resolve.apply(this, [source, args, context, info]);
            
    
        };
    }
}