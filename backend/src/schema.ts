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

const readFile = promisify(fs.readFile);

export async function makeSchema() {
  const typeDefs = (
    await readFile(path.join(__dirname, "schema.gql"))
  ).toString();

  return makeExecutableSchema({
    typeDefs,
    resolvers,
    schemaDirectives: {
      isUserOrAdmin: IsUserOrAdminDirective,
      isAuthenticated: IsAuthenticatedDirective,
      hasCatalogPermission: HasCatalogPermissionDirective,
      hasPackagePermission: HasPackagePermissionDirective,
      isSiteAdmin: IsSiteAdminDirective,
    },
  });
}
