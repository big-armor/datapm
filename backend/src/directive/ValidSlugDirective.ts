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

export class ValidSlugDirective extends SchemaDirectiveVisitor {
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
			const slug: string | undefined = args.catalogSlug || args.packageSlug || undefined;

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
	const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;

	if (slug === undefined) throw new ValidationError(`REQUIRED`);

	if (slug.length == 0) throw new ValidationError(`REQUIRED`);

	if (slug.length > 100) throw new ValidationError(`TOO_LONG`);

	if (slug.match(regex) == null) throw new ValidationError("INVALID_CHARACTERS");
}

class ValidatedType extends GraphQLScalarType {
	constructor(type: GraphQLScalarType) {
		super({
			name: `ValidatedSlug`,

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
