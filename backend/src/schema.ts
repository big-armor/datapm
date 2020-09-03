import fs from "fs";
import path from "path";
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
const ConstraintDirective = require('apollo-server-constraint-directive');

const readFile = promisify(fs.readFile);

const nodeModulesDirectory = getEnvVariable("NODE_MODULES_DIRECTORY", "node_modules");

export async function makeSchema() {
  const typeDefs = (
    await readFile(nodeModulesDirectory + "/datapm-lib/schema.gql")
  ).toString();

  return makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      constraint: ConstraintDirective,
      isUserOrAdmin: IsUserOrAdminDirective,
      isAuthenticated: IsAuthenticatedDirective,
      hasCatalogPermission: HasCatalogPermissionDirective,
      hasPackagePermission: HasPackagePermissionDirective,
      isSiteAdmin: IsSiteAdminDirective,
      validEmailAddress: ValidEmailDirective,
      validUsername: ValidUsernameDirective,
      validPassword: ValidPasswordDirective,
      validSlug: ValidSlugDirective

    },
  });
}