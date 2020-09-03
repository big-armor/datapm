import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { GraphQLField, defaultFieldResolver, GraphQLArgument, GraphQLObjectType, GraphQLInterfaceType, GraphQLInputField, GraphQLInputObjectType } from "graphql";
import { Context } from "../context";

export class ValidSlugDirective extends SchemaDirectiveVisitor {



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
      
        const slug: string | undefined = args.catalogSlug || args.packageSlug || undefined;

        self.validateSlug(slug)

        return resolve.apply(this, [source, args, context, info]);
    };
  }

  visitInputFieldDefinition(
    field: GraphQLInputField,
    details: {
      objectType: GraphQLInputObjectType;
    }
  ): GraphQLInputField | void | null {

    return field;
  }

  validateSlug(slug:String | undefined) {
    const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;

    if(slug === undefined)
        throw new ValidationError(`REQUIRED`);

    if(slug.length == 0)
        throw new ValidationError(`REQUIRED`);    

    if(slug.length > 100)
        throw new ValidationError(`TOO_LONG`);

    if(slug.match(regex) == null)
        throw new ValidationError("INVALID_CHARACTERS");    
    }

}