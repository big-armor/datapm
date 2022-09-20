import { SchemaDirectiveVisitor, ValidationError } from "apollo-server";
import {
    GraphQLField,
    defaultFieldResolver,
    GraphQLArgument,
    GraphQLObjectType,
    GraphQLInterfaceType,
    GraphQLInputField,
    GraphQLInputObjectType,
    Kind
} from "graphql";
import { Context } from "../context";
import { packageSlugValid } from "datapm-lib";
import { ValidationConstraint } from "./ValidationConstraint";

import { ValidationType } from "./ValidationType";

export class ValidPackageSlugDirective extends SchemaDirectiveVisitor {
    visitArgumentDefinition(
        argument: GraphQLArgument,
        details: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            field: GraphQLField<any, any>;
            objectType: GraphQLObjectType | GraphQLInterfaceType;
        }
    ): GraphQLArgument | void | null {
        const { resolve = defaultFieldResolver } = details.field;
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self = this;
        details.field.resolve = function (source, args, context: Context, info) {
            const slug: string | undefined = args.packageSlug || undefined;

            validatePackageSlug(slug);

            return resolve.apply(this, [source, args, context, info]);
        };
    }

    visitInputFieldDefinition(
        field: GraphQLInputField,
        details: {
            objectType: GraphQLInputObjectType;
        }
    ): GraphQLInputField | void | null {
        field.type = ValidationType.create(field.type, new PackageSlugConstraint());
    }
}

export function validatePackageSlug(slug: string | undefined): void {
    const validPackageSlug = packageSlugValid(slug);

    if (validPackageSlug === "PACKAGE_SLUG_REQUIRED") throw new ValidationError(`PACKAGE_SLUG_REQUIRED`);

    if (validPackageSlug === "PACKAGE_SLUG_TOO_LONG") throw new ValidationError(`PACKAGE_SLUG_REQUIRED`);

    if (validPackageSlug === "PACKAGE_SLUG_INVALID") throw new ValidationError(`PACKAGE_SLUG_INVALID`);
}

class PackageSlugConstraint implements ValidationConstraint {
    getName(): string {
        return "PackageSlug";
    }

    validate(value: string) {
        validatePackageSlug(value);
    }

    getCompatibleScalarKinds(): string[] {
        return [Kind.STRING];
    }
}
