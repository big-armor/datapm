import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { GraphQLField, defaultFieldResolver, GraphQLArgument, GraphQLObjectType, GraphQLInterfaceType, GraphQLInputField, GraphQLInputObjectType } from "graphql";
import { Context } from "../context";
import { INVALID_USERNAME_ERROR } from "../generated/graphql";

export class ValidUsernameDirective extends SchemaDirectiveVisitor {

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
      const username: string | undefined = args.username || args.value?.username || undefined;
      self.validateUsername(username)
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

  private validateUsername(username: String | undefined): void {
    const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;

    if (username === undefined) {
      throw new ValidationError(INVALID_USERNAME_ERROR.USERNAME_REQUIRED);
    }

    if (username.length == 0) {
      throw new ValidationError(INVALID_USERNAME_ERROR.USERNAME_REQUIRED);
    }

    if (username.length > 39) {
      throw new ValidationError(INVALID_USERNAME_ERROR.USERNAME_TOO_LONG);
    }

    if (username.match(regex) == null) {
      throw new ValidationError(INVALID_USERNAME_ERROR.INVALID_CHARACTERS);
    }
  }

}