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
import { AuthenticatedContext, Context } from "../context";
import { validateCollectionSlug } from "datapm-lib";
import { Kind } from "graphql";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";

export class ValidCollectionSlugDirective extends SchemaDirectiveVisitor {
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
            const slug: string | undefined = args.collectionSlug || undefined;

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
        field.type = ValidationType.create(field.type, new CollectionSlugConstraint());
    }
}

export function validateSlug(slug: String | undefined) {
    if (slug === undefined) throw new ValidationError(`COLLECTION_SLUG_REQUIRED`);

    if (slug.length == 0) throw new ValidationError(`COLLECTION_SLUG_REQUIRED`);

    if (slug.length > 100) throw new ValidationError(`COLLECTION_SLUG_TOO_LONG`);

    if (!validateCollectionSlug(slug)) throw new ValidationError("COLLECTION_SLUG_INVALID");
}

class CollectionSlugConstraint implements ValidationConstraint {
    getName(): string {
        return "CollectionSlug";
    }

    validate(value: String) {
        validateSlug(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
