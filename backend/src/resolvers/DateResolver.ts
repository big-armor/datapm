import { Kind, GraphQLScalarType } from "graphql";

export class DateResolver extends GraphQLScalarType {
    constructor() {
        super({
            name: "Date",
            description: "Date custom scalar type",
            parseValue(value) {
                return new Date(value); // value from the client
            },
            serialize(value: Date) {
                return value.toISOString(); // value sent to the client
            },
            parseLiteral(ast) {
                if (ast.kind === Kind.INT) {
                    return ast.value; // ast value is always in string format
                }
                return null;
            }
        });
    }
}
