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
        if (field.type instanceof GraphQLNonNull && field.type.ofType instanceof GraphQLScalarType) {
            field.type = new GraphQLNonNull(new ValidatedType(field.type.ofType));
        } else if (field.type instanceof GraphQLScalarType) {
            field.type = new ValidatedType(field.type);
        } else {
            throw new Error(`Not a scalar type: ${field.type}`);
        }
    }
}

function validateSlug(slug: String | undefined) {
    if (slug === undefined) throw new ValidationError(`PACKAGE_SLUG_REQUIRED`);

    if (slug.length == 0) throw new ValidationError(`PACKAGE_SLUG_REQUIRED`);

    if (slug.length > 100) throw new ValidationError(`PACKAGE_SLUG_TOO_LONG`);

    if (!validatePackageSlug(slug)) throw new ValidationError("PACKAGE_SLUG_INVALID");
}

class ValidatedType extends GraphQLScalarType {
    constructor(type: GraphQLScalarType) {
        super({
            name: `ValidatedPackageSlug`,

            // For more information about GraphQLScalar type (de)serialization,
            // see the graphql-js implementation:
            // https://github.com/graphql/graphql-js/blob/31ae8a8e8312/src/type/definition.js#L425-L446

            serialize(value) {
                value = type.serialize(value);

                return value;
            },

            parseValue(value) {
                validateSlug(value);

                return type.parseValue(value);
            },

            parseLiteral(valueNode, variables) {
                return type.parseLiteral(valueNode, variables);
            }
        });
    }
}
