import {
  SchemaDirectiveVisitor,
  AuthenticationError,
  ForbiddenError,
} from "apollo-server";
import {
  GraphQLObjectType,
  GraphQLField,
  defaultFieldResolver,
  GraphQLArgument,
  GraphQLInterfaceType,
} from "graphql";
import { Context } from "../context";

export class IsSiteAdminDirective extends SchemaDirectiveVisitor {
  visitObject(object: GraphQLObjectType) {
    const fields = object.getFields();
    for (let field of Object.values(fields)) {
      this.visitFieldDefinition(field);
    }
  }

  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    field.resolve = function (source, args, context: Context, info) {
      if (!context.me) throw new AuthenticationError("No active user session");
      if (!context.me.isSiteAdmin) throw new ForbiddenError("Not siteadmin");
      return resolve.apply(this, [source, args, context, info]);
    };
  }

  visitArgumentDefinition(
    argument: GraphQLArgument,
    details: {
      field: GraphQLField<any, any>;
      objectType: GraphQLObjectType | GraphQLInterfaceType;
    }
  ): GraphQLArgument | void | null {
    const { resolve = defaultFieldResolver } = details.field;
    details.field.resolve = function (source, args, context: Context, info) {
      if (args[argument.name] !== undefined) {
        // argument was specified. check for isSiteAdmin
        if (!context.me) throw new AuthenticationError("No active user session");
        if (!context.me.isSiteAdmin) throw new ForbiddenError("Not siteadmin");
      }

      return resolve.apply(this, [source, args, context, info]);
    };
  }
}
