import { EntityRepository, Repository } from "typeorm";
import { PlatformStateEntity } from "../entity/PlatformStateEntity";

@EntityRepository(PlatformStateEntity)
export class PlatformStateRepository extends Repository<PlatformStateEntity> {
    public async findStateByKey(key: string): Promise<PlatformStateEntity | undefined> {
        return await this.createQueryBuilder().where("key = :key").setParameter("key", key).getOne();
    }
}
