import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { GraphQLField, defaultFieldResolver } from "graphql";
import { Context } from "../context";

export class ValidEmailDirective extends SchemaDirectiveVisitor {


    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;

        field.resolve = function (source, args, context: Context, info) {

            const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

            const emailAddress: string | undefined = args.username || args.value.username || undefined;
    
            if(emailAddress == null)
                throw new ValidationError(`Email Address must be provided`);

            if(emailAddress.length == 0)
                throw new ValidationError(`Email Address must be provided`);    

            if(emailAddress.length > 100)
                throw new ValidationError(`Email Address must be less or equal too than 100 characters`);

            if(emailAddress.match(regex) == null)
                throw new ValidationError("Email Address format not valid");
            
            return resolve.apply(this, [source, args, context, info]);
            
    
        };
    }
}