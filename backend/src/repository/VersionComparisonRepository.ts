import { EntityRepository, Repository } from "typeorm";
import { VersionComparisonEntity } from "../entity/VersionComparisonEntity";

@EntityRepository(VersionComparisonEntity)
export class VersionComparisonRepository extends Repository<VersionComparisonEntity> {
    public createNewComparison(newVersionId: number, oldVersionId: number): Promise<VersionComparisonEntity> {
        const entity = this.create();
        entity.newVersionId = newVersionId;
        entity.oldVersionId = oldVersionId;
        return this.save(entity);
    }

    public getComparisonByVersionIds(
        newVersionId: number,
        oldVersionId: number,
        relations: string[] = []
    ): Promise<VersionComparisonEntity | undefined> {
        return this.createQueryBuilder()
            .where('"VersionComparisonEntity"."new_version_id" = :newVersionId')
            .andWhere('"VersionComparisonEntity"."old_version_id" = :oldVersionId')
            .setParameter("newVersionId", newVersionId)
            .setParameter("oldVersionId", oldVersionId)
            .addRelations("VersionComparisonEntity", relations)
            .getOne();
    }
}
