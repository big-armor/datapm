import { Difference } from "datapm-lib";
import { EntityManager, EntityRepository, Repository } from "typeorm";
import { VersionComparisonEntity } from "../entity/VersionComparisonEntity";
import { VersionDifferenceEntity } from "../entity/VersionDifferenceEntity";
import { VersionDifferenceRepository } from "./VersionDifferenceRepository";

export async function saveVersionComparison(
    transaction: EntityManager,
    newVersionId: number,
    oldVersionId: number,
    differences: Difference[]
): Promise<{ comparisonEntity: VersionComparisonEntity; differencesEntitities: VersionDifferenceEntity[] }> {
    const comparisonRepository = transaction.getCustomRepository(VersionComparisonRepository);
    const comparisonEntity = await comparisonRepository.createNewComparison(newVersionId, oldVersionId);

    let differencesEntitities: VersionDifferenceEntity[] = [];

    if (differences.length) {
        const differencesRepository = transaction.getCustomRepository(VersionDifferenceRepository);
        differencesEntitities = await differencesRepository.batchCreateNewDifferences(comparisonEntity.id, differences);
    }

    return { comparisonEntity, differencesEntitities };
}

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
