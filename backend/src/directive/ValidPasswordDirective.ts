import { SchemaDirectiveVisitor, ValidationError } from "apollo-server";
import {
    Kind,
    GraphQLField,
    defaultFieldResolver,
    GraphQLInputField,
    GraphQLInputObjectType,
    GraphQLArgument,
    GraphQLInterfaceType,
    GraphQLObjectType
} from "graphql";

import { Context } from "../context";
import { INVALID_PASSWORD_ERROR } from "../generated/graphql";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";
import { passwordValid } from "datapm-lib";

export class ValidPasswordDirective extends SchemaDirectiveVisitor {
    visitArgumentDefinition(
        argument: GraphQLArgument,
        details: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        details.field.resolve = function (source, args, context: Context, info) {
            const password: string | undefined = args.password || args.value?.password || undefined;
            validatePassword(password);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<unknown, Context>): void {
        const { resolve = defaultFieldResolver } = field;
        field.resolve = function (source, args, context: Context, info) {
            const password: string | undefined = args.password || args.value.password || undefined;

            validatePassword(password);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitInputFieldDefinition(
        field: GraphQLInputField,
        details: {
            objectType: GraphQLInputObjectType;
        }
    ): GraphQLInputField | void | null {
        field.type = ValidationType.create(field.type, new PasswordConstraint());
    }
}

export function validatePassword(password: string | undefined): void {
    const passwordValidResponse = passwordValid(password);

    if (passwordValidResponse === "PASSWORD_REQUIRED") {
        throw new ValidationError(INVALID_PASSWORD_ERROR.PASSWORD_REQUIRED);
    }
    if (passwordValidResponse === "PASSWORD_TOO_LONG") {
        throw new ValidationError(INVALID_PASSWORD_ERROR.PASSWORD_TOO_LONG);
    }

    if (passwordValidResponse === "PASSWORD_TOO_SHORT") {
        throw new ValidationError(INVALID_PASSWORD_ERROR.PASSWORD_TOO_SHORT);
    }

    if (passwordValidResponse === "INVALID_CHARACTERS") {
        throw new ValidationError(INVALID_PASSWORD_ERROR.INVALID_CHARACTERS);
    }
}
export class PasswordConstraint implements ValidationConstraint {
    getName(): string {
        return "Password";
    }

    validate(value: string): void {
        validatePassword(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
