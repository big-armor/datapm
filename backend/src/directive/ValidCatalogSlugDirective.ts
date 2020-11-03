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
import { validateCatalogSlug } from "datapm-lib";
import { ValidationConstraint } from "./ValidationConstraint";
import { Kind } from "graphql";
import { ValidationType } from "./ValidationType";

export class ValidCatalogSlugDirective extends SchemaDirectiveVisitor {
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
            const slug: string | undefined = args.catalogSlug || undefined;

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
        field.type = ValidationType.create(field.type, new CatalogSlugConstraint());
    }
}

export function validateSlug(slug: String | undefined) {
    if (slug === undefined) throw new ValidationError(`CATALOG_SLUG_REQUIRED`);

    if (slug.length == 0) throw new ValidationError(`CATALOG_SLUG_REQUIRED`);

    if (slug.length > 38) throw new ValidationError(`CATALOG_SLUG_TOO_LONG`);

    if (!validateCatalogSlug(slug)) throw new ValidationError("CATALOG_SLUG_INVALID");
}

export class CatalogSlugConstraint implements ValidationConstraint {
    getName(): string {
        return "CatalogSlug";
    }

    validate(value: String) {
        validateSlug(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
