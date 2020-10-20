import { DeleteResult, EntityRepository, Repository } from "typeorm";

import { CollectionPackage } from "../entity/CollectionPackage";

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
}
