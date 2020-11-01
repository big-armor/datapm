import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
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
import { validateUsername } from "./ValidUsernameDirective";
import { validateEmailAddress } from "./ValidEmailDirective";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";
import { Kind } from "graphql";

export class ValidUsernameOrEmailAddressDirective extends SchemaDirectiveVisitor {
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

            validateUsernameOrEmail(username);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitInputFieldDefinition(
        field: GraphQLInputField,
        details: {
            objectType: GraphQLInputObjectType;
        }
    ): GraphQLInputField | void | null {
        field.type = ValidationType.create(field.type, new UsernameOrEmailAddressConstraint());
    }
}

export function validateUsernameOrEmail(value: String | undefined) {
    if (value?.indexOf("@") != -1) validateEmailAddress(value);
    else validateUsername(value);
}

class UsernameOrEmailAddressConstraint implements ValidationConstraint {
    getName(): string {
        return "UsernameOrEmailAddress";
    }

    validate(value: String) {
        validateUsernameOrEmail(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
