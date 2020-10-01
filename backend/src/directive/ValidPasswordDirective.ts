import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { GraphQLField, defaultFieldResolver, GraphQLInputField, GraphQLInputObjectType, GraphQLArgument, GraphQLInterfaceType, GraphQLObjectType } from "graphql";
import { Context } from "../context";
import { INVALID_PASSWORD_ERROR } from "../generated/graphql";

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

  visitInputFieldDefinition(
    field: GraphQLInputField,
    details: {
      objectType: GraphQLInputObjectType;
    }
  ): GraphQLInputField | void | null {
    return field;
  }

  private validatePassword(password: String | undefined): void {
    const regex = /[0-9@#$%]/;

    if (password === undefined || password.length == 0) {
      throw new ValidationError(INVALID_PASSWORD_ERROR.PASSWORD_REQUIRED);
    }
    if (password.length > 99) {
      throw new ValidationError(INVALID_PASSWORD_ERROR.PASSWORD_TOO_LONG);
    }

    if (password.length < 8) {
      throw new ValidationError(INVALID_PASSWORD_ERROR.PASSWORD_TOO_SHORT);
    }

    if (password.length < 16 && password.match(regex) == null) {
      throw new ValidationError(INVALID_PASSWORD_ERROR.INVALID_CHARACTERS);
    }
  }
}