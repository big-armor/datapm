import {
  SchemaDirectiveVisitor,
  AuthenticationError,
  ForbiddenError,
} from "apollo-server";
import { GraphQLObjectType, GraphQLField, defaultFieldResolver } from "graphql";
import { Context } from "../context";
import { Permission, PackageIdentifier } from "../generated/graphql";
import { MeCatalog } from "../util/me";
import { PackageRepository } from "../repository/PackageRepository";
import { UserPackagePermission } from "../entity/UserPackagePermission";
import { PackagePermissionRepository } from "../repository/PackagePermissionRepository";

async function hasPermission(permission: Permission, context: Context, identifier: PackageIdentifier): Promise<boolean> {

  if(context.me === undefined) {
    throw new Error(`No user session found`);
  }
  // Check that the package exists
  const packageEntity = await context.connection.getCustomRepository(PackageRepository).findPackageOrFail({
    identifier
  });

  // TODO That the user has access to the catalog and/or package
  const packagePermissions = await context.connection.getCustomRepository(PackagePermissionRepository).findPackagePermissions({
    packageId: packageEntity.id,
    userId: context.me?.id
  })


  if(packagePermissions === undefined)
    return false;

  let found = false;

  for(let p of packagePermissions.permissions){
    if(p === permission)
      return true;
  }

  return false;
  
}

export class HasPackagePermissionDirective extends SchemaDirectiveVisitor {
  visitObject(object: GraphQLObjectType) {
    const fields = object.getFields();
    for (let field of Object.values(fields)) {
      this.visitFieldDefinition(field);
    }
  }

  visitFieldDefinition(field: GraphQLField<any, any>) {
    const { resolve = defaultFieldResolver } = field;
    const permission: Permission = this.args.permission;
    field.resolve = function (source, args, context: Context, info) {

      if (!context.me) throw new AuthenticationError("No active user session");

      const identifier: PackageIdentifier | undefined = args.identifier || undefined;

      if(identifier === undefined)
        throw new Error(`No package identifier defined`);

      if (hasPermission(permission, context, identifier)) {
        return resolve.apply(this, [source, args, context, info]);
      } else {
        throw new ForbiddenError(`User does not have the "${permission}" permission`);
      }
    };
  }
}
