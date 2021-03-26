import { Difference } from "datapm-lib";
import { EntityRepository, Repository } from "typeorm";
import { VersionDifferenceEntity } from "../entity/VersionDifferenceEntity";

@EntityRepository(VersionDifferenceEntity)
export class VersionDifferenceRepository extends Repository<VersionDifferenceEntity> {
    public batchCreateNewDifferences(
        comparisonId: number,
        differences: Difference[]
    ): Promise<VersionDifferenceEntity[]> {
        const entities = differences.map((difference) => {
            const entity = new VersionDifferenceEntity();
            entity.versionComparisonId = comparisonId;
            entity.type = difference.type;
            entity.pointer = difference.pointer;
            return entity;
        });
        return this.save(entities);
    }
}
