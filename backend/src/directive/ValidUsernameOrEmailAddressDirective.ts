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
import { validateUsername } from "./ValidUsernameDirective";
import { validateEmailAddress } from "./ValidEmailDirective";

export class ValidUsernameOrEmailAddressDirective extends SchemaDirectiveVisitor {
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

            validateUsernameOrEmail(username);

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

function validateUsernameOrEmail(value: String | undefined) {
    if (value?.indexOf("@") != -1) validateEmailAddress(value);
    else validateUsername(value);
}

class ValidatedType extends GraphQLScalarType {
    constructor(type: GraphQLScalarType) {
        super({
            name: `String`,

            // For more information about GraphQLScalar type (de)serialization,
            // see the graphql-js implementation:
            // https://github.com/graphql/graphql-js/blob/31ae8a8e8312/src/type/definition.js#L425-L446

            serialize(value) {
                value = type.serialize(value);

                return value;
            },

            parseValue(value) {
                validateUsernameOrEmail(value);

                return type.parseValue(value);
            },

            parseLiteral(valueNode, variables) {
                return type.parseLiteral(valueNode, variables);
            }
        });
    }
}
