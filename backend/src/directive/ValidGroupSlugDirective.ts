import { SchemaDirectiveVisitor, ValidationError } from "apollo-server";
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
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";

export const GROUP_SLUG_REGEX = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/i;

export function groupSlugValid(
    slug: string | undefined
): "GROUP_SLUG_REQUIRED" | "GROUP_SLUG_TOO_LONG" | "GROUP_SLUG_INVALID" | true {
    if (slug === undefined) return `GROUP_SLUG_REQUIRED`;

    if (slug.length === 0) return `GROUP_SLUG_INVALID`;

    if (slug.length > 38) return `GROUP_SLUG_TOO_LONG`;

    if (!slug.match(GROUP_SLUG_REGEX)) return `GROUP_SLUG_INVALID`;

    return true;
}

export class ValidGroupSlugDirective extends SchemaDirectiveVisitor {
    visitArgumentDefinition(
        _argument: GraphQLArgument,
        details: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        details.field.resolve = function (source, args, context: Context, info) {
            const slug: string | undefined = args.groupSlug || undefined;

            validateGroupSlug(slug);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitInputFieldDefinition(
        field: GraphQLInputField,
        _details: {
            objectType: GraphQLInputObjectType;
        }
    ): GraphQLInputField | void | null {
        field.type = ValidationType.create(field.type, new GroupSlugConstraint());
    }
}

export function validateGroupSlug(slug: string | undefined): void {
    const validGroupSlug = groupSlugValid(slug);

    if (validGroupSlug === "GROUP_SLUG_REQUIRED") throw new ValidationError(`GROUP_SLUG_REQUIRED`);

    if (validGroupSlug === "GROUP_SLUG_TOO_LONG") throw new ValidationError(`GROUP_SLUG_TOO_LONG`);

    if (validGroupSlug === "GROUP_SLUG_INVALID") throw new ValidationError("GROUP_SLUG_INVALID");
}

export class GroupSlugConstraint implements ValidationConstraint {
    getName(): string {
        return "GroupSlug";
    }

    validate(value: string): void {
        validateGroupSlug(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
