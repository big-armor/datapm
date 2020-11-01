import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { Kind } from "graphql";
import {
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLObjectType,
    GraphQLInterfaceType,
    GraphQLInputField,
    GraphQLInputObjectType,
    GraphQLScalarType,
    GraphQLNonNull
} from "graphql";
import { Context } from "../context";
import { INVALID_USERNAME_ERROR } from "../generated/graphql";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";

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
            validateUsername(username);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        const self = this;
        field.resolve = function (source, args, context: Context, info) {
            const username: string | undefined = args.username || args.value?.username || undefined;

            validateUsername(username);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitInputFieldDefinition(
        field: GraphQLInputField,
        details: {
            objectType: GraphQLInputObjectType;
        }
    ): GraphQLInputField | void | null {
        field.type = ValidationType.create(field.type, new UsernameConstraint());
    }
}

export function validateUsername(username: String | undefined): void {
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

    if (username.toLowerCase().match(regex) == null) {
        throw new ValidationError(INVALID_USERNAME_ERROR.INVALID_CHARACTERS);
    }
}

class UsernameConstraint implements ValidationConstraint {
    getName(): string {
        return "CollectionSlug";
    }

    validate(value: String) {
        validateUsername(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
