import { DeleteResult, EntityRepository, Repository } from "typeorm";
import { Permission } from "../generated/graphql";

import { CollectionPackageEntity } from "../entity/CollectionPackageEntity";
import { PackageEntity } from "../entity/PackageEntity";
import { CollectionEntity } from "../entity/CollectionEntity";

const PUBLIC_PACKAGES_QUERY = '("PackageEntity"."isPublic" is true)';
const AUTHENTICATED_USER_PACKAGES_QUERY = `(("PackageEntity"."isPublic" is false and "PackageEntity"."catalog_id" in (select uc.catalog_id from user_catalog uc where uc.user_id = :userId))
          or ("PackageEntity"."isPublic" is false and "PackageEntity".id in (select up.package_id from user_package_permission up where up.user_id = :userId and :permission = ANY(up.permission))))`;
const AUTHENTICATED_USER_OR_PUBLIC_PACKAGES_QUERY = `(${PUBLIC_PACKAGES_QUERY} or ${AUTHENTICATED_USER_PACKAGES_QUERY})`;

const PUBLIC_COLLECTIONS_QUERY = '("CollectionEntity"."is_public" is true)';
const AUTHENTICATED_USER_COLLECTIONS_QUERY = `("CollectionEntity".id in (select cu.collection_id from collection_user cu where cu.user_id = :userId and :permission = ANY(cu.permissions)))`;
const AUTHENTICATED_USER_OR_PUBLIC_COLLECTIONS_QUERY = `(${PUBLIC_COLLECTIONS_QUERY} or ${AUTHENTICATED_USER_COLLECTIONS_QUERY})`;

@EntityRepository(CollectionPackageEntity)
export class CollectionPackageRepository extends Repository<CollectionPackageEntity> {
    private static readonly TABLE_RELATIONS_ALIAS = "CollectionPackage";

    public async addPackageToCollection(
        userId: number,
        collectionId: number,
        packageId: number
    ): Promise<CollectionPackageEntity> {
        const collectionPackage = new CollectionPackageEntity();
        collectionPackage.addedBy = userId;
        collectionPackage.collectionId = collectionId;
        collectionPackage.packageId = packageId;
        return this.save(collectionPackage);
    }

    public async removePackageToCollection(collectionId: number, packageId: number): Promise<DeleteResult> {
        return this.createQueryBuilder().delete().where({ collectionId: collectionId, packageId: packageId }).execute();
    }

    public async findByCollectionId(collectionId: number, relations?: string[]): Promise<CollectionPackageEntity[]> {
        return this.createQueryBuilder(CollectionPackageRepository.TABLE_RELATIONS_ALIAS)
            .where({ collectionId: collectionId })
            .addRelations(CollectionPackageRepository.TABLE_RELATIONS_ALIAS, relations)
            .getMany();
    }

    findByCollectionIdAndPackageId(
        collectionId: number,
        packageId: number,
        relations: string[]
    ): PromiseLike<CollectionPackageEntity | undefined> {
        const value = this.createQueryBuilder(CollectionPackageRepository.TABLE_RELATIONS_ALIAS)
            .where({ collectionId: collectionId, packageId: packageId })
            .addRelations(CollectionPackageRepository.TABLE_RELATIONS_ALIAS, relations)
            .getOne();

        return value;
    }

    public async collectionPackages(
        userId: number,
        collectionId: number,
        limit: number,
        offset: number,
        relations?: string[]
    ): Promise<PackageEntity[]> {
        const ALIAS = "PackageEntity";
        return await this.manager
            .getRepository(PackageEntity)
            .createQueryBuilder()
            .where(
                '("PackageEntity"."id" IN (SELECT package_id FROM collection_package WHERE collection_id = :collectionId))',
                { collectionId: collectionId }
            )
            .andWhere(AUTHENTICATED_USER_OR_PUBLIC_PACKAGES_QUERY, { userId: userId, permission: Permission.VIEW })
            .orderBy('"PackageEntity"."created_at"', "DESC")
            .addRelations(ALIAS, relations)
            .limit(limit)
            .offset(offset)
            .getMany();
    }

    public async packageCollections(
        userId: number,
        packageId: number,
        limit: number,
        offset: number,
        relations?: string[]
    ): Promise<[collectionEntity: CollectionEntity[], count: number]> {
        const ALIAS = "CollectionEntity";
        return await this.manager
            .getRepository(CollectionEntity)
            .createQueryBuilder()
            .where(
                '("CollectionEntity"."id" IN (SELECT collection_id FROM collection_package WHERE package_id = :packageId))',
                { packageId }
            )
            .andWhere(AUTHENTICATED_USER_OR_PUBLIC_COLLECTIONS_QUERY, { userId: userId, permission: Permission.VIEW })
            .orderBy('"CollectionEntity"."created_at"', "DESC")
            .addRelations(ALIAS, relations)
            .limit(limit)
            .offset(offset)
            .getManyAndCount();
    }
}
