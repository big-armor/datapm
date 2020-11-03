import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import {
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLObjectType,
    GraphQLInterfaceType,
    GraphQLInputField,
    GraphQLInputObjectType,
    GraphQLNonNull,
    GraphQLScalarType
} from "graphql";
import { Context } from "../context";
import { validatePackageSlug } from "datapm-lib";
import { ValidationConstraint } from "./ValidationConstraint";
import { Kind } from "graphql";
import { ValidationType } from "./ValidationType";

export class ValidPackageSlugDirective extends SchemaDirectiveVisitor {
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
            const slug: string | undefined = args.packageSlug || undefined;

            validateSlug(slug);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitInputFieldDefinition(
        field: GraphQLInputField,
        details: {
            objectType: GraphQLInputObjectType;
        }
    ): GraphQLInputField | void | null {
        field.type = ValidationType.create(field.type, new PackageSlugConstraint());
    }
}

export function validateSlug(slug: String | undefined) {
    if (slug === undefined) throw new ValidationError(`PACKAGE_SLUG_REQUIRED`);

    if (slug.length == 0) throw new ValidationError(`PACKAGE_SLUG_REQUIRED`);

    if (slug.length > 100) throw new ValidationError(`PACKAGE_SLUG_TOO_LONG`);

    if (!validatePackageSlug(slug)) throw new ValidationError("PACKAGE_SLUG_INVALID");
}

class PackageSlugConstraint implements ValidationConstraint {
    getName(): string {
        return "PackageSlug";
    }

    validate(value: String) {
        validateSlug(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
