import { SchemaDirectiveVisitor } from "apollo-server";
import {
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLField,
    GraphQLInputField,
    GraphQLInputObjectType,
    GraphQLInterfaceType,
    GraphQLObjectType,
    Kind
} from "graphql";
import { Context } from "../context";
import { ValidationConstraint } from "./ValidationConstraint";
import { ValidationType } from "./ValidationType";

export class ValidateMarkdownDirective extends SchemaDirectiveVisitor {
    visitArgumentDefinition(
        argument: GraphQLArgument,
        details: {
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        const maxLength = this.args.maxLength;
        const self = this;
        details.field.resolve = function (source, args, context: Context, info) {
            const markdown: string | undefined = args.content || args.value?.content || undefined;
            validateMarkdown(markdown, maxLength);
            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitInputFieldDefinition(
        field: GraphQLInputField,
        _details: {
            objectType: GraphQLInputObjectType;
        }
    ) {
        field.type = ValidationType.create(field.type, new MarkdownConstraint());
    }
}

class MarkdownConstraint implements ValidationConstraint {
    getName(): string {
        return "markdown";
    }

    validate(value: string) {
        validateMarkdown(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}

function validateMarkdown(markdown: string | undefined, maxLength: number = 50000): void {
    if (!markdown) {
        throw new Error("No markdown provided");
    } else if (markdown.length > maxLength) {
        throw new Error("Markdown too long");
    }
}
