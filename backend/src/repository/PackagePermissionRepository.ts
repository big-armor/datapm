import { EntityRepository, EntityManager } from "typeorm";

import { UserPackagePermission } from "../entity/UserPackagePermission";
import { UserRepository } from "./UserRepository";
import { Permission, PackageIdentifier, PackageIdentifierInput } from "../generated/graphql";
import { PackageRepository } from "./PackageRepository";

async function getPackagePermissions({
  manager,
  packageId,
  userId,
  relations = [],
}: {
  manager: EntityManager;
  packageId: number;
  userId: number;
  relations?: string[];
}): Promise<UserPackagePermission | undefined> {
  const ALIAS = "userPackagePermission";
  return manager
    .getRepository(UserPackagePermission)
    .createQueryBuilder(ALIAS)
    .addRelations(ALIAS, relations)
    .where({ packageId, userId })
    .getOne();
}

@EntityRepository()
export class PackagePermissionRepository {
  constructor(private manager: EntityManager) {}

  findPackagePermissions({
    packageId,
    userId,
    relations = [],
  }: {
    packageId: number;
    userId: number;
    relations?: string[];
  }): Promise<UserPackagePermission | undefined> {
    return getPackagePermissions({
      manager: this.manager,
      packageId,
      userId,
      relations,
    });
  }

  setPackagePermissions({
    identifier,
    username,
    permissions,
    relations = [],
  }: {
    identifier: PackageIdentifierInput;
    username: string;
    permissions: Permission[];
    relations?: string[];
  }): Promise<UserPackagePermission> {
    return this.manager.nestedTransaction(async (transaction) => {


      // ensure user exists and is part of team
      const user = await transaction
        .getCustomRepository(UserRepository)
        .findUser({ username });
      if (!user) {
        throw new Error(`User ${username} not found`);
      }

      const catalogSlug = identifier.catalogSlug;
      const packageSlug = identifier.packageSlug;

      // ensure user exists and is part of team
      const packageEntity = await transaction
          .getCustomRepository(PackageRepository)
          .findPackageOrFail({ identifier });



      await transaction
        .createQueryBuilder()
        .insert()
        .into(UserPackagePermission)
        .values({
          packageId: packageEntity.id,
          userId: user.id,
          permissions: permissions,
        })
        .execute();

      // return all case roles associated with this caseId with relations
      const packagePermission = await getPackagePermissions({
        manager: transaction,
        packageId: packageEntity.id,
        userId: user.id,
        relations,
      });

      if(packagePermission === undefined)
        throw new Error(`Package not found after updating permissions. This should never happen!`);

      return packagePermission;
    });
  }

  removePackagePermission({
    identifier,
    username
  }: {
    identifier: PackageIdentifierInput;
    username: string;
    relations?: string[];
  }): void {
    this.manager.nestedTransaction(async (transaction) => {

      const user = await transaction.getCustomRepository(UserRepository).findOneOrFail({username});
      const packageEntity = await transaction.getCustomRepository(PackageRepository).findPackageOrFail({identifier});

      await transaction.delete(UserPackagePermission, {package: packageEntity,user });

    });
  }
}
