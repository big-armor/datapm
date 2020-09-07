import { EntityRepository, EntityManager, Like, Brackets } from "typeorm";
import { v4 as uuid } from "uuid";

import {
  CreatePackageInput,
  UpdatePackageInput,
  Permission,
  PackageIdentifier,
  PackageIdentifierInput,
} from "../generated/graphql";
import { Package } from "../entity/Package";

import { UserPackagePermission } from "../entity/UserPackagePermission";
import { Catalog } from "../entity/Catalog";
import { CatalogRepository } from "./CatalogRepository";
import { UserCatalogPermission } from "../entity/UserCatalogPermission";
import { VersionRepository } from "./VersionRepository"
import { Permissions } from "../entity/Permissions";
import { allPermissions } from "../util/PermissionsUtil";
import { catalogIdentifier } from "../util/IdentifierUtil";
import { User } from "../entity/User";

async function findPackageById(
  manager: EntityManager,
  packageId: number,
  relations: string[]
): Promise<Package | null> {
  const ALIAS = "package";
  const packageEntity = await manager
    .getRepository(Package)
    .createQueryBuilder(ALIAS)
    .where({ id: packageId, isActive: true })
    .addRelations(ALIAS,relations)
    .getOne();

  return packageEntity || null;
}

async function findPackage(
  manager: EntityManager,
  catalogSlug: string,
  packageSlug: string,
  relations: string[]
): Promise<Package | null> {
  const ALIAS = "package";

  const catalog = await manager
    .getRepository(Catalog)
    .findOneOrFail({where: {slug: catalogSlug }});

  const packageEntity = await manager
    .getRepository(Package)
    .findOne({where: {catalogId: catalog.id, slug: packageSlug, isActive: true}, relations: relations});

  return packageEntity || null;
}

function getNameLength(name: string | undefined | null) {
  return name ? name.trim().length : 0;
}

function validation(packageEntity: Package) {
  if (
    getNameLength(packageEntity.slug) === 0 &&
    getNameLength(packageEntity.displayName) === 0 &&
    getNameLength(packageEntity.description) === 0
  ) {
    throw new Error("You should type the name or package file number at least.");
  }
}

function setPackageDisabled(packageEntity: Package, transaction:EntityManager) {
  transaction.getCustomRepository(VersionRepository).disableVersions(packageEntity.versions);

  packageEntity.isActive = false;
  packageEntity.slug = packageEntity.slug + "-DISABLED-" + (new Date().getTime());


}

@EntityRepository()
export class PackageRepository {

  constructor(private manager: EntityManager) {}


  async findOrFail({
    identifier,
    relations = [],
  }: {
    identifier: PackageIdentifierInput,
    relations?: string[]
  }): Promise<Package> {

    const catalog = await this.manager.getRepository(Catalog).findOneOrFail({slug: identifier.catalogSlug});

    const packageEntity = await this.manager.getRepository(Package).findOneOrFail({where: {catalogId: catalog.id, slug: identifier.packageSlug}, relations});

    return packageEntity;
  }
  
  async catalogPackagesForUser(
    {
      catalogId,
      user,
      relations = []
    }:{
      catalogId:number,
      user:User,
      relations?:string[]

    }):Promise<Package[]> {
    const ALIAS = "packagesForUser"

    const packageIds = (await this
      .manager
      .getRepository(Package)
      .query(
        `select id from "package" p where p.catalog_id = $1 
        and (p."isPublic" is true 
        or (p."isPublic" is false and p.catalog_id in (select uc.catalog_id from user_catalog uc where uc.user_id = $2))
        or (p."isPublic" is false and p.id in (select up.package_id from user_package_permission up where up.user_id = $2))
      )`,
        [
          catalogId,
          user.id
        ]
      )).map((p:{id:number})=> p.id);

    const packageEntity = await this
      .manager
      .getRepository(Package)
      .createQueryBuilder()
      .whereInIds(packageIds)
      .addRelations(ALIAS,relations)
      .getMany();
      

    return packageEntity;
  }

  async findPackageByIdOrFail({
    packageId,
    relations = [],
  }: {
    packageId: number;
    relations?: string[];
  }): Promise<Package> {

    const packageEntity = await findPackageById(this.manager,packageId,relations);
  
    if(packageEntity === null)
      throw new Error("NOT_FOUND");
  
    return packageEntity;
  }

  async findPackage({
    identifier,
    relations = [],
  }: {
    identifier: PackageIdentifierInput,
    relations?: string[];

  }): Promise<Package | null> {

    const packageEntity = await findPackage(this.manager,identifier.catalogSlug,identifier.packageSlug, relations);
  
    return packageEntity;

  }

  async findPackageOrFail({
    identifier,
    relations = [],
  }: {
    identifier: PackageIdentifierInput,
    relations?: string[];

  }): Promise<Package> {

    const packageEntity = await this.findPackage({identifier,relations});
  
    if(packageEntity == null)
      throw new Error("NOT_FOUND");
  
    return packageEntity;

  }

  findPackages({
    catalogId
  }: {
    catalogId: number;
  }) {
    const PRODUCTS_ALIAS = "packages";
    let query = this.manager
      .getRepository(Package)
      .createQueryBuilder(PRODUCTS_ALIAS)
      .where({ catalogId: catalogId, isActive: true });

    return query.getMany();
  }

  findPackageById({
    packageId,
    relations = [],
  }: {
    packageId: number;
    relations?: string[];
  }) {
    return findPackageById(this.manager, packageId, relations);
  }

  createPackage({
    userId,
    packageInput,
    relations = [],
  }: {
    userId: number;
    packageInput: CreatePackageInput;
    relations?: string[];
  }): Promise<Package> {
    return this.manager.nestedTransaction(async (transaction) => {

      const catalog = await transaction.getCustomRepository(CatalogRepository).findCatalogBySlug({slug: packageInput.catalogSlug});

      const packageEntity = transaction.getRepository(Package).create();

      packageEntity.catalogId = catalog.id;
      packageEntity.displayName = packageInput.displayName;
      packageEntity.slug = packageInput.packageSlug;
      packageEntity.description = packageInput.description || null;
      packageEntity.createdAt = new Date();
      packageEntity.updatedAt = new Date();
      packageEntity.isActive = true;

      validation(packageEntity);

      const insertedPackage = await transaction.save(packageEntity);



      // add user as package manager of new package
      await transaction
        .getRepository(UserPackagePermission)
        .insert({ packageId: insertedPackage.id, userId, permissions: allPermissions(), createdAt: new Date() });

      // requery resulting inserted person for graphql query result
      // needed to add proper joins
      const queryPackage = await findPackageById(
        transaction,
        insertedPackage.id,
        relations
      );
      if (!queryPackage) {
        throw new Error(
          "Unable to retrieve newly created package - this should never happen"
        );
      }

      return queryPackage;
    });
  }

  updatePackage({
    catalogSlug,
    packageSlug,
    packageInput,
    relations = [],
  }: {
    catalogSlug: string;
    packageSlug: string;
    packageInput: UpdatePackageInput;
    relations?: string[];
  }): Promise<Package> {
    return this.manager.nestedTransaction(async (transaction) => {
      const ALIAS = "package";
      
      const packageEntity = await findPackage(this.manager, catalogSlug, packageSlug, relations);

      if(packageEntity === null) {
        throw new Error("Could not find package");
      }

      if(packageInput.newCatalogSlug) {
        packageEntity.catalogId = (await transaction.getCustomRepository(CatalogRepository).findOneOrFail({slug: packageInput.newCatalogSlug})).id;
      }

      if(packageInput.newPackageSlug) {
        packageEntity.slug = packageInput.newPackageSlug;
      }

      if(packageInput.displayName)
        packageEntity.displayName = packageInput.displayName;

      if(packageInput.description)
        packageEntity.description = packageInput.description;

      if(packageInput.isPublic?.valueOf() !== undefined)
        packageEntity.isPublic = packageInput.isPublic?.valueOf();
      

      validation(packageEntity);

      await transaction.save(packageEntity, { data: { packageInput } });

      // re-query resulting updated person for graphql query result
      // needed to add proper joins
      const queryPackage = await findPackageById(
        transaction,
        packageEntity.id,
        relations
      );
      if (!queryPackage) {
        throw new Error(
          "Unable to retrieve updated package - this should never happen"
        );
      }

      return queryPackage;
    });
  }

  async disablePackage({
    identifier,
    relations = [],
  }: {
    identifier: PackageIdentifierInput;
    relations?: string[];
  }): Promise<Package> {
    const package_ = await this.manager.nestedTransaction(async (transaction) => {
      const ALIAS = "package";

      const catalogSlug = identifier.catalogSlug;
      const packageSlug = identifier.packageSlug;
      
      const package_ = await transaction
        .getRepository(Package)
        .createQueryBuilder(ALIAS)
        .where({ catalogSlug, packageSlug })
        .addRelations(ALIAS, [
          ...relations,
        ])
        .getOne();
      if (!package_) {
        throw new Error(`Could not find Package  ${catalogSlug}/${packageSlug}`);
      }

      setPackageDisabled(package_, transaction);

      await transaction.save(package_);

      return package_;
    });

    return package_;
  }


  async disablePackages({
    packages,
    relations = [],
  }: {
    packages: Package[];
    relations?: string[];
  }): Promise<Package[]> {
    return this.manager.nestedTransaction(async (transaction) => {
      
      const returnValue:Package[] = [];
      packages.forEach(async p =>{
        setPackageDisabled(p, transaction);
        returnValue.push(await transaction.save(p));
      })

      return returnValue;
    });

  }

  async search({
    query, 
    limit, 
    offSet,
    relations = [],
  }: {
    query: string;
    limit: number;
    offSet: number;
    relations?: string[];
  }):Promise<[Package[],number]>  {

    const ALIAS = "search";

    return await this.manager
    .getRepository(Package)
    .createQueryBuilder(ALIAS)
    .where({slug: Like('%' + query + '%')})
    .skip(offSet)
    .take(limit)
    .addRelations(ALIAS, [
      ...relations,
    ])
    .getManyAndCount();


  }


}
