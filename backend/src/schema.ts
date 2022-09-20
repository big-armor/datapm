import fs from "fs";
import { promisify } from "util";
import { makeExecutableSchema } from "apollo-server";
import { resolvers } from "./resolvers";
import { IsAuthenticatedDirective } from "./directive/isAuthenticatedDirective";
import { HasCatalogPermissionDirective } from "./directive/hasCatalogPermissionDirective";
import { HasPackagePermissionDirective } from "./directive/hasPackagePermissionDirective";
import { IsAdminDirective } from "./directive/isSiteAdminDirective";
import { ValidEmailDirective } from "./directive/ValidEmailDirective";
import { ValidUsernameDirective } from "./directive/ValidUsernameDirective";
import { ValidPasswordDirective } from "./directive/ValidPasswordDirective";
import { HasCollectionPermissionDirective } from "./directive/hasCollectionPermissionDirective";
import { IsUserOrAdminDirective } from "./directive/isUserOrAdminDirective";
import { ValidCatalogSlugDirective } from "./directive/ValidCatalogSlugDirective";
import { ValidPackageSlugDirective } from "./directive/ValidPackageSlugDirective";
import { ValidCollectionSlugDirective } from "./directive/ValidCollectionSlugDirective";
import { ValidateImageUploadDirective } from "./directive/ValidImageUploadDirective";
import { ValidBase64ImageUploadDirective } from "./directive/ValidBase64ImageUploadDirective";
import { ValidUsernameOrEmailAddressDirective } from "./directive/ValidUsernameOrEmailAddressDirective";
import { ValidateMarkdownDirective } from "./directive/ValidMarkdownDirective";
import { HasGroupPermissionDirective } from "./directive/hasGroupPermissionDirective.ts";
import { ValidGroupSlugDirective } from "./directive/ValidGroupSlugDirective";
import { GraphQLSchema } from "graphql";

const SCHEMAS_DIRECTORY = "node_modules/datapm-lib/";
const SCHEMA_FILES = [
    "schema.gql",
    "auth-schema.gql",
    "user-schema.gql",
    "api-key-schema.gql",
    "images-schema.gql",
    "group-schema.gql"
];

const readFile = promisify(fs.readFile);

export async function makeSchema(): Promise<GraphQLSchema> {
    const typeDefs = await buildSchemas();

    return makeExecutableSchema({
        typeDefs,
        resolvers,
        schemaDirectives: {
            isUserOrAdmin: IsUserOrAdminDirective,
            isAuthenticated: IsAuthenticatedDirective,
            hasCatalogPermission: HasCatalogPermissionDirective,
            hasCollectionPermission: HasCollectionPermissionDirective,
            hasGroupPermission: HasGroupPermissionDirective,
            hasPackagePermission: HasPackagePermissionDirective,
            isAdmin: IsAdminDirective,
            validEmailAddress: ValidEmailDirective,
            validUsername: ValidUsernameDirective,
            validUsernameOrEmailAddress: ValidUsernameOrEmailAddressDirective,
            validPassword: ValidPasswordDirective,
            validCatalogSlug: ValidCatalogSlugDirective,
            validGroupSlug: ValidGroupSlugDirective,
            validPackageSlug: ValidPackageSlugDirective,
            validCollectionSlug: ValidCollectionSlugDirective,
            validImageUpload: ValidateImageUploadDirective,
            validBase64Image: ValidBase64ImageUploadDirective,
            validMarkdown: ValidateMarkdownDirective
        }
    });
}

async function buildSchemas() {
    const schemas: string[] = [];
    for (let i = 0; i < SCHEMA_FILES.length; i++) {
        const schema = await readSchemaFile(SCHEMA_FILES[i]);
        schemas.push(schema);
    }
    return schemas;
}

async function readSchemaFile(name: string) {
    const content = await readFile(SCHEMAS_DIRECTORY + name);
    return content.toString();
}
