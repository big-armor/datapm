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
import { catalogSlugValid } from "datapm-lib";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";

export class ValidCatalogSlugDirective extends SchemaDirectiveVisitor {
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
            const slug: string | undefined = args.catalogSlug || undefined;

            validateCatalogSlug(slug);

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

export function validateCatalogSlug(slug: string | undefined): void {
    const validCatalogSlug = catalogSlugValid(slug);

    if (validCatalogSlug === "CATALOG_SLUG_REQUIRED") throw new ValidationError(`CATALOG_SLUG_REQUIRED`);

    if (validCatalogSlug === "CATALOG_SLUG_TOO_LONG") throw new ValidationError(`CATALOG_SLUG_TOO_LONG`);

    if (validCatalogSlug === "CATALOG_SLUG_INVALID") throw new ValidationError("CATALOG_SLUG_INVALID");
}

export class CatalogSlugConstraint implements ValidationConstraint {
    getName(): string {
        return "CatalogSlug";
    }

    validate(value: string): void {
        validateCatalogSlug(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
