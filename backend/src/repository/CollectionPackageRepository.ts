import {
  DeleteResult,
  EntityRepository,
  Repository,
} from "typeorm";

import { CollectionPackage } from "../entity/CollectionPackage";

@EntityRepository(CollectionPackage)
export class CollectionPackageRepository extends Repository<CollectionPackage> {

  public async addPackageToCollection(userId: number, collectionId: number, packageId: number): Promise<CollectionPackage> {
    const collectionPackage = new CollectionPackage();
    collectionPackage.collectionId = collectionId;
    collectionPackage.packageId = packageId;
    collectionPackage.addedBy = userId;
    return this.save(collectionPackage);
  }

  public async removePackageToCollection(collectionId: number, packageId: number): Promise<DeleteResult> {
    return this.createQueryBuilder()
    .delete()
    .where({ collectionId: collectionId, packageId: packageId })
    .execute();
  }

  public async findByCollectionId(collectionId: number): Promise<CollectionPackage[]> {
    return this.createQueryBuilder()
      .where({ collectionId: collectionId })
      .getMany();
  }
}
