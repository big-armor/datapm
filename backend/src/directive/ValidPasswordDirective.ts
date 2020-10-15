import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import {
	GraphQLField,
	defaultFieldResolver,
	GraphQLInputField,
	GraphQLInputObjectType,
	GraphQLArgument,
	GraphQLInterfaceType,
	GraphQLObjectType,
	GraphQLNonNull,
	GraphQLScalarType
} from "graphql";
import { Context } from "../context";
import { INVALID_PASSWORD_ERROR } from "../generated/graphql";

export class ValidPasswordDirective extends SchemaDirectiveVisitor {
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
			const password: string | undefined = args.password || args.value.password || undefined;
			validatePassword(password);
			return resolve.apply(this, [source, args, context, info]);
		};
	}

	visitFieldDefinition(field: GraphQLField<any, any>) {
		const { resolve = defaultFieldResolver } = field;
		field.resolve = function (source, args, context: Context, info) {
			const password: string | undefined = args.password || args.value.password || undefined;

			validatePassword(args.password);

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

function validatePassword(password: String | undefined): void {
	const regex = /[0-9@#$%]/;

	if (password === undefined || password.length == 0) {
		throw new ValidationError(INVALID_PASSWORD_ERROR.PASSWORD_REQUIRED);
	}
	if (password.length > 99) {
		throw new ValidationError(INVALID_PASSWORD_ERROR.PASSWORD_TOO_LONG);
	}

	if (password.length < 8) {
		throw new ValidationError(INVALID_PASSWORD_ERROR.PASSWORD_TOO_SHORT);
	}

	if (password.length < 16 && password.match(regex) == null) {
		throw new ValidationError(INVALID_PASSWORD_ERROR.INVALID_CHARACTERS);
	}
}

class ValidatedType extends GraphQLScalarType {
	constructor(type: GraphQLScalarType) {
		super({
			name: `ValidatedPassword`,

			// For more information about GraphQLScalar type (de)serialization,
			// see the graphql-js implementation:
			// https://github.com/graphql/graphql-js/blob/31ae8a8e8312/src/type/definition.js#L425-L446

			serialize(value) {
				value = type.serialize(value);

				return value;
			},

			parseValue(value) {
				validatePassword(value);

				return type.parseValue(value);
			},

			parseLiteral(valueNode, variables) {
				return type.parseLiteral(valueNode, variables);
			}
		});
	}
}
