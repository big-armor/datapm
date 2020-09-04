import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { GraphQLField, defaultFieldResolver, GraphQLInputField, GraphQLInputObjectType, GraphQLArgument, GraphQLInterfaceType, GraphQLObjectType } from "graphql";
import { Context } from "../context";

export class ValidPasswordDirective extends SchemaDirectiveVisitor {
    
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
          
    
            const password: string | undefined = args.password || args.value.password || undefined;
    
            self.validatePassword(password)
    
            return resolve.apply(this, [source, args, context, info]);
        };
      }
      
    validatePassword(password:String | undefined) {
        const regex = /[0-9@#$%]/;

        if(password === undefined)
            throw new ValidationError(`REQUIRED`);

        if(password.length == 0)
            throw new ValidationError(`REQUIRED`);    

        if(password.length > 99)
            throw new ValidationError(`TO_LONG`);

        if(password.length < 8)
            throw new ValidationError(`TO_SHORT`);

        if(password.length < 16
            && password.match(regex) == null) {
            throw new ValidationError(`INVALID_CHARACTERS`);
        }

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