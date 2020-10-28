import fs from "fs";
import { promisify } from "util";
import { makeExecutableSchema } from "apollo-server";

import { resolvers } from "./resolvers";
import { IsAuthenticatedDirective } from "./directive/isAuthenticatedDirective";
import { HasCatalogPermissionDirective } from "./directive/hasCatalogPermissionDirective";
import { HasPackagePermissionDirective } from "./directive/hasPackagePermissionDirective";
import { IsAdminDirective } from "./directive/isSiteAdminDirective";
import { getEnvVariable } from "./util/getEnvVariable";
import { ValidEmailDirective } from "./directive/ValidEmailDirective";
import { ValidUsernameDirective } from "./directive/ValidUsernameDirective";
import { ValidPasswordDirective } from "./directive/ValidPasswordDirective";
import { HasCollectionPermissionDirective } from "./directive/hasCollectionPermissionDirective";
import { IsUserOrAdminDirective } from "./directive/isUserOrAdminDirective";
import { ValidCatalogSlugDirective } from "./directive/ValidCatalogSlugDirective";
import { ValidPackageSlugDirective } from "./directive/ValidPackageSlugDirective";
import { ValidCollectionSlugDirective } from "./directive/ValidCollectionSlugDirective";
import { ValidateImageUploadDirective } from "./directive/ValidImageUploadDirective";

const NODE_MODULES_DIRECTORY = getEnvVariable("NODE_MODULES_DIRECTORY", "node_modules");
const SCHEMAS_DIRECTORY = NODE_MODULES_DIRECTORY + "/datapm-lib/";
const SCHEMA_FILES = ["schema.gql", "auth-schema.gql", "user-schema.gql", "api-key-schema.gql", "images-schema.gql"];

const readFile = promisify(fs.readFile);

export async function makeSchema() {
    const typeDefs = await buildSchemas();

    return makeExecutableSchema({
        typeDefs,
        resolvers,
        schemaDirectives: {
            isUserOrAdmin: IsUserOrAdminDirective,
            isAuthenticated: IsAuthenticatedDirective,
            hasCatalogPermission: HasCatalogPermissionDirective,
            hasCollectionPermission: HasCollectionPermissionDirective,
            hasPackagePermission: HasPackagePermissionDirective,
            isAdmin: IsAdminDirective,
            validEmailAddress: ValidEmailDirective,
            validUsername: ValidUsernameDirective,
            validPassword: ValidPasswordDirective,
            validCatalogSlug: ValidCatalogSlugDirective,
            validPackageSlug: ValidPackageSlugDirective,
            validCollectionSlug: ValidCollectionSlugDirective,
            validImageUpload: ValidateImageUploadDirective
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
