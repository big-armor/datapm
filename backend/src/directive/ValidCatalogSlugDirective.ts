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
import { validateCatalogSlug } from "datapm-lib";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";

export class ValidCatalogSlugDirective extends SchemaDirectiveVisitor {
    visitArgumentDefinition(
        _argument: GraphQLArgument,
        details: {
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        details.field.resolve = function (source, args, context: Context, info) {
            const slug: string | undefined = args.catalogSlug || undefined;

            validateSlug(slug);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitInputFieldDefinition(
        field: GraphQLInputField,
        _details: {
            objectType: GraphQLInputObjectType;
        }
    ): GraphQLInputField | void | null {
        field.type = ValidationType.create(field.type, new CatalogSlugConstraint());
    }
}

export function validateSlug(slug: string | undefined): void {
    if (slug === undefined) throw new ValidationError(`CATALOG_SLUG_REQUIRED`);

    if (slug.length == 0) throw new ValidationError(`CATALOG_SLUG_REQUIRED`);

    if (slug.length > 38) throw new ValidationError(`CATALOG_SLUG_TOO_LONG`);

    if (!validateCatalogSlug(slug)) throw new ValidationError("CATALOG_SLUG_INVALID");
}

export class CatalogSlugConstraint implements ValidationConstraint {
    getName(): string {
        return "CatalogSlug";
    }

    validate(value: string): void {
        validateSlug(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
