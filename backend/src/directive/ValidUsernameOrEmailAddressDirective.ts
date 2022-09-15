import { SchemaDirectiveVisitor } from "apollo-server";
import {
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLObjectType,
    GraphQLInterfaceType,
    GraphQLInputField,
    GraphQLInputObjectType,
    Kind
} from "graphql";
import { Context } from "../context";
import { validateUsername } from "./ValidUsernameDirective";
import { validateEmailAddress } from "./ValidEmailDirective";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";

export class ValidUsernameOrEmailAddressDirective extends SchemaDirectiveVisitor {
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
            const username: string | undefined =
                args.username ||
                args.usernameOrEmailAddress ||
                args.value?.username ||
                args.value?.usernameOrEmailAddress ||
                undefined;
            validateUsernameOrEmail(username);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<unknown, Context>): void {
        const { resolve = defaultFieldResolver } = field;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        field.resolve = function (source, args, context: Context, info) {
            const username: string | undefined =
                args.username ||
                args.usernameOrEmailAddress ||
                args.value?.username ||
                args.value?.usernameOrEmailAddress ||
                undefined;

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

export function validateUsernameOrEmail(value: string | undefined): void {
    if (value?.indexOf("@") !== -1) {
        validateEmailAddress(value);
    } else {
        validateUsername(value);
    }
}

class UsernameOrEmailAddressConstraint implements ValidationConstraint {
    getName(): string {
        return "UsernameOrEmailAddress";
    }

    validate(value: string) {
        validateUsernameOrEmail(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
