import { SchemaDirectiveVisitor, ApolloError, ValidationError } from "apollo-server";
import {
    GraphQLField,
    defaultFieldResolver,
    GraphQLInputField,
    GraphQLInputObjectType,
    GraphQLArgument,
    GraphQLObjectType,
    GraphQLInterfaceType,
    GraphQLNonNull,
    GraphQLScalarType
} from "graphql";
import { Context } from "../context";

export class ValidEmailDirective extends SchemaDirectiveVisitor {
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
            const emailAddress: string | undefined = args.emailAddress || args.value?.emailAddress || undefined;

            validateEmailAddress(emailAddress);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitFieldDefinition(field: GraphQLField<any, any>) {
        const { resolve = defaultFieldResolver } = field;
        const self = this;
        field.resolve = function (source, args, context: Context, info) {
            const emailAddress: string | undefined = args.emailAddress || args.value?.emailAddress || undefined;

            validateEmailAddress(emailAddress);

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

export function validateEmailAddress(emailAddress: String | undefined) {
    const regex = /^(?=[A-Z0-9][A-Z0-9@._%+-]{5,253}$)[A-Z0-9._%+-]{1,64}@(?:(?=[A-Z0-9-]{1,63}\.)[A-Z0-9]+(?:-[A-Z0-9]+)*\.){1,8}[A-Z]{2,63}$/i;

    if (emailAddress == null) throw new ValidationError(`REQUIRED`);

    if (emailAddress.length == 0) throw new ValidationError(`REQUIRED`);

    if (emailAddress.length > 254) throw new ValidationError(`TOO_LONG`);

    if (emailAddress.match(regex) == null) throw new ValidationError("INVALID_FORMAT");
}

class ValidatedType extends GraphQLScalarType {
    constructor(type: GraphQLScalarType) {
        super({
            name: `ValidatedEmailAddress`,

            // For more information about GraphQLScalar type (de)serialization,
            // see the graphql-js implementation:
            // https://github.com/graphql/graphql-js/blob/31ae8a8e8312/src/type/definition.js#L425-L446

            serialize(value) {
                value = type.serialize(value);

                return value;
            },

            parseValue(value) {
                validateEmailAddress(value);

                return type.parseValue(value);
            },

            parseLiteral(valueNode, variables) {
                return type.parseLiteral(valueNode, variables);
            }
        });
    }
}
