import { SchemaDirectiveVisitor, ValidationError } from "apollo-server";
import {
    Kind,
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLObjectType,
    GraphQLInterfaceType,
    GraphQLInputField,
    GraphQLInputObjectType
} from "graphql";

import { Context } from "../context";
import { INVALID_USERNAME_ERROR } from "../generated/graphql";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";
import { usernameValid } from "datapm-lib";

export class ValidUsernameDirective extends SchemaDirectiveVisitor {
    visitArgumentDefinition(
        argument: GraphQLArgument,
        details: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        details.field.resolve = function (source, args, context: Context, info) {
            const username: string | undefined = args.username || args.value?.username || undefined;
            validateUsername(username);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<unknown, Context>): void {
        const { resolve = defaultFieldResolver } = field;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
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

export function validateUsername(username: string | undefined): void {
    const validUsername = usernameValid(username);

    if (validUsername === "USERNAME_REQUIRED") {
        throw new ValidationError(INVALID_USERNAME_ERROR.USERNAME_REQUIRED);
    }

    if (validUsername === "USERNAME_TOO_LONG") {
        throw new ValidationError(INVALID_USERNAME_ERROR.USERNAME_TOO_LONG);
    }

    if (validUsername === "INVALID_CHARACTERS") {
        throw new ValidationError(INVALID_USERNAME_ERROR.INVALID_CHARACTERS);
    }
}

class UsernameConstraint implements ValidationConstraint {
    getName(): string {
        return "Username";
    }

    validate(value: string) {
        validateUsername(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
