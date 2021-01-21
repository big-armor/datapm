import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import { Kind } from "graphql";
import {
    GraphQLField,
    defaultFieldResolver,
    GraphQLInputField,
    GraphQLInputObjectType,
    GraphQLArgument,
    GraphQLObjectType,
    GraphQLInterfaceType
} from "graphql";
import { Context } from "../context";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";
import { emailAddressValid } from "datapm-lib";
import { INVALID_EMAIL_ADDRESS_ERROR } from "../generated/graphql";

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

            validateEmailAddress(emailAddress);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        const self = this;
        field.resolve = function (source, args, context: Context, info) {
            const emailAddress: string | undefined = args.emailAddress || args.value?.emailAddress || undefined;

            validateEmailAddress(emailAddress);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitInputFieldDefinition(
        field: GraphQLInputField,
        details: {
            objectType: GraphQLInputObjectType;
        }
    ): GraphQLInputField | void | null {
        field.type = ValidationType.create(field.type, new CollectionSlugConstraint());
    }
}

export function validateEmailAddress(emailAddress: string | undefined) {
    const validEmailAddress = emailAddressValid(emailAddress);

    if (validEmailAddress == "REQUIRED") {
        throw new ValidationError(INVALID_EMAIL_ADDRESS_ERROR.REQUIRED);
    }

    if (validEmailAddress == "TOO_LONG") {
        throw new ValidationError(INVALID_EMAIL_ADDRESS_ERROR.TOO_LONG);
    }

    if (validEmailAddress == "INVALID_EMAIL_ADDRESS_FORMAT") {
        throw new ValidationError(INVALID_EMAIL_ADDRESS_ERROR.INVALID_EMAIL_ADDRESS_FORMAT);
    }
}

class CollectionSlugConstraint implements ValidationConstraint {
    getName(): string {
        return "EmailAddress";
    }

    validate(value: string) {
        validateEmailAddress(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
