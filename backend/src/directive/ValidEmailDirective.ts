import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { GraphQLField, defaultFieldResolver, GraphQLInputField, GraphQLInputObjectType, GraphQLArgument, GraphQLObjectType, GraphQLInterfaceType } from "graphql";
import { Context } from "../context";

export class ValidEmailDirective extends SchemaDirectiveVisitor {


    visitArgumentDefinition(
        argument: GraphQLArgument,
        details: {
          field: GraphQLField<any, any>;
          objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
      ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        const self = this;
        details.field.resolve = function (source, args, context: Context, info) {
          
    
            const emailAddress: string | undefined = args.emailAddress || args.value?.emailAddress || undefined;
    
            self.validateEmailAddress(emailAddress)
    
            return resolve.apply(this, [source, args, context, info]);
        };
      }

    validateEmailAddress(emailAddress: String | undefined) {
        const regex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

        if(emailAddress == null)
            throw new ValidationError(`REQUIRED`);

        if(emailAddress.length == 0)
            throw new ValidationError(`REQUIRED`);    

        if(emailAddress.length > 100)
            throw new ValidationError(`TOO_LONG`);

        if(emailAddress.match(regex) == null)
            throw new ValidationError("INVALID_FORMAT");
        
    }


  visitInputFieldDefinition(
    field: GraphQLInputField,
    details: {
      objectType: GraphQLInputObjectType;
    }
  ): GraphQLInputField | void | null {

    return field;
  }
}