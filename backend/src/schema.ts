import fs from "fs";
import { promisify } from "util";
import { makeExecutableSchema } from "apollo-server";

import { resolvers } from "./resolvers";
import { IsAuthenticatedDirective } from "./directive/isAuthenticatedDirective";
import { HasCatalogPermissionDirective } from "./directive/hasCatalogPermissionDirective";
import { HasPackagePermissionDirective } from "./directive/hasPackagePermissionDirective";
import { IsSiteAdminDirective } from "./directive/isSiteAdminDirective";
import { IsUserOrAdminDirective } from "./directive/isUserOrAdminDirective";
import { getEnvVariable } from "./util/getEnvVariable";
import { ValidEmailDirective } from "./directive/ValidEmailDirective";
import { ValidUsernameDirective } from "./directive/ValidUsernameDirective";
import { ValidPasswordDirective } from "./directive/ValidPasswordDirective";
import { ValidSlugDirective } from "./directive/ValidSlugDirective";
import { HasCollectionPermissionDirective } from "./directive/hasCollectionPermissionDirective";
const ConstraintDirective = require('apollo-server-constraint-directive');

const NODE_MODULES_DIRECTORY = getEnvVariable("NODE_MODULES_DIRECTORY", "node_modules");
const SCHEMAS_DIRECTORY = NODE_MODULES_DIRECTORY + "/datapm-lib/";
const SCHEMA_FILES = ["schema.gql", "auth-schema.gql", "user-schema.gql", "api-key-schema.gql"];

const readFile = promisify(fs.readFile);

export async function makeSchema() {
  const typeDefs = await buildSchemas();

  return makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      constraint: ConstraintDirective,
      isUserOrAdmin: IsUserOrAdminDirective,
      isAuthenticated: IsAuthenticatedDirective,
      hasCatalogPermission: HasCatalogPermissionDirective,
      hasCollectionPermission: HasCollectionPermissionDirective,
      hasPackagePermission: HasPackagePermissionDirective,
      isSiteAdmin: IsSiteAdminDirective,
      validEmailAddress: ValidEmailDirective,
      validUsername: ValidUsernameDirective,
      validPassword: ValidPasswordDirective,
      validSlug: ValidSlugDirective
    },
  });
}

async function buildSchemas() {
  const schemas = [];
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