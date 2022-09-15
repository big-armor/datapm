import { GraphQLInputType, GraphQLNonNull, ValueNode, GraphQLScalarType, GraphQLNullableType } from "graphql";

import { Maybe } from "graphql/jsutils/Maybe";
import { ValidationConstraint } from "./ValidationConstraint";

/**
 * A validation type is injected from a validation directive and serves the purpose of
 * applying the passed constraint to the type.
 *
 * Unfortunately input types don't currently have a "resolve" mechanism from directives
 * so this is a workaround
 */
export class ValidationType extends GraphQLScalarType {
    /**
     * Create a new validation type with the existing type wrapped inside
     */
    static create(
        type: GraphQLInputType,
        constraint: ValidationConstraint
    ): ValidationType | GraphQLNonNull<GraphQLNullableType> {
        // Wrap scalar types directly
        if (type instanceof GraphQLScalarType) {
            return new this(type, constraint);
        }

        // If the root is a non-null type, we should wrap the inner type instead
        if (type instanceof GraphQLNonNull && type.ofType instanceof GraphQLScalarType) {
            return new GraphQLNonNull(new this(type.ofType, constraint));
        }

        throw new Error(`Type ${type} cannot be validated. Only scalars are accepted`);
    }

    /**
     * Create the wrapper type and validation handler for the constraint on the type
     */
    private constructor(type: GraphQLScalarType, constraint: ValidationConstraint) {
        super({
            name: `${constraint.getName()}`,
            description: "Scalar type wrapper for input validation",

            /**
             * Server -> Client
             */
            serialize(value) {
                return type.serialize(value);
            },

            /**
             * Client (Variable) -> Server
             */
            parseValue(value) {
                const parsedValue = type.parseValue(value);

                constraint.validate(parsedValue);

                return parsedValue;
            },

            /**
             * Client (Param) -> Server
             */
            parseLiteral(valueNode: ValueNode, variables?: Maybe<{ [key: string]: unknown }>) {
                const parsedValue = type.parseLiteral(valueNode, variables);

                constraint.validate(parsedValue);

                return parsedValue;
            }
        });
    }
}
