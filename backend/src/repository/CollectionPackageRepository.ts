import { DeleteResult, EntityRepository, Repository } from "typeorm";
import { Permission } from "../generated/graphql";

import { CollectionPackage } from "../entity/CollectionPackage";
import { Package } from "../entity/Package";

const PUBLIC_PACKAGES_QUERY = '("Package"."isPublic" is true)';
const AUTHENTICATED_USER_PACKAGES_QUERY = `(("Package"."isPublic" is false and "Package"."catalog_id" in (select uc.catalog_id from user_catalog uc where uc.user_id = :userId))
          or ("Package"."isPublic" is false and "Package".id in (select up.package_id from user_package_permission up where up.user_id = :userId and :permission = ANY(up.permission))))`;
const AUTHENTICATED_USER_OR_PUBLIC_PACKAGES_QUERY = `(${PUBLIC_PACKAGES_QUERY} or ${AUTHENTICATED_USER_PACKAGES_QUERY})`;

@EntityRepository(CollectionPackage)
export class CollectionPackageRepository extends Repository<CollectionPackage> {
    private static readonly TABLE_RELATIONS_ALIAS = "CollectionPackage";

    public async addPackageToCollection(
        userId: number,
        collectionId: number,
        packageId: number
    ): Promise<CollectionPackage> {
        const collectionPackage = new CollectionPackage();
        collectionPackage.addedBy = userId;
        collectionPackage.collectionId = collectionId;
        collectionPackage.packageId = packageId;
        return this.save(collectionPackage);
    }

    public async removePackageToCollection(collectionId: number, packageId: number): Promise<DeleteResult> {
        return this.createQueryBuilder().delete().where({ collectionId: collectionId, packageId: packageId }).execute();
    }

    public async findByCollectionId(collectionId: number, relations?: string[]): Promise<CollectionPackage[]> {
        return this.createQueryBuilder(CollectionPackageRepository.TABLE_RELATIONS_ALIAS)
            .where({ collectionId: collectionId })
            .addRelations(CollectionPackageRepository.TABLE_RELATIONS_ALIAS, relations)
            .getMany();
    }

    findByCollectionIdAndPackageId(
        collectionId: number,
        packageId: number,
        relations: string[]
    ): PromiseLike<CollectionPackage | undefined> {
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
    ): Promise<Package[]> {
        const ALIAS = "Package";
        return await this.manager
            .getRepository(Package)
            .createQueryBuilder()
            .where(
                '("Package"."id" IN (SELECT package_id FROM collection_package WHERE collection_id = :collectionId))',
                { collectionId: collectionId }
            )
            .andWhere(AUTHENTICATED_USER_OR_PUBLIC_PACKAGES_QUERY, { userId: userId, permission: Permission.VIEW })
            .orderBy('"Package"."created_at"', "DESC")
            .addRelations(ALIAS, relations)
            .limit(limit)
            .offset(offset)
            .getMany();
    }
}
