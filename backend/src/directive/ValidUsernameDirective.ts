import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import {
	GraphQLField,
	defaultFieldResolver,
	GraphQLArgument,
	GraphQLObjectType,
	GraphQLInterfaceType,
	GraphQLInputField,
	GraphQLInputObjectType,
	GraphQLScalarType,
	GraphQLNonNull
} from "graphql";
import { Context } from "../context";
import { INVALID_USERNAME_ERROR } from "../generated/graphql";

export class ValidUsernameDirective extends SchemaDirectiveVisitor {
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
			const username: string | undefined = args.username || args.value?.username || undefined;
			validateUsername(username);
			return resolve.apply(this, [source, args, context, info]);
		};
	}

	visitFieldDefinition(field: GraphQLField<any, any>) {
		const { resolve = defaultFieldResolver } = field;
		const self = this;
		field.resolve = function (source, args, context: Context, info) {
			const username: string | undefined = args.username || args.value?.username || undefined;

			validateUsername(username);

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

function validateUsername(username: String | undefined): void {
	const regex = /^[a-z\d](?:[a-z\d]|-(?=[a-z\d])){0,38}$/;

	if (username === undefined) {
		throw new ValidationError(INVALID_USERNAME_ERROR.USERNAME_REQUIRED);
	}

	if (username.length == 0) {
		throw new ValidationError(INVALID_USERNAME_ERROR.USERNAME_REQUIRED);
	}

	if (username.length > 39) {
		throw new ValidationError(INVALID_USERNAME_ERROR.USERNAME_TOO_LONG);
	}

	if (username.match(regex) == null) {
		throw new ValidationError(INVALID_USERNAME_ERROR.INVALID_CHARACTERS);
	}
}

class ValidatedType extends GraphQLScalarType {
	constructor(type: GraphQLScalarType) {
		super({
			name: `ValidatedUsername`,

			// For more information about GraphQLScalar type (de)serialization,
			// see the graphql-js implementation:
			// https://github.com/graphql/graphql-js/blob/31ae8a8e8312/src/type/definition.js#L425-L446

			serialize(value) {
				value = type.serialize(value);

				return value;
			},

			parseValue(value) {
				validateUsername(value);

				return type.parseValue(value);
			},

			parseLiteral(valueNode, variables) {
				return type.parseLiteral(valueNode, variables);
			}
		});
	}
}
