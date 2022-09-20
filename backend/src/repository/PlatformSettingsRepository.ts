import { EntityRepository, Repository } from "typeorm";
import { PlatformSettingsEntity } from "../entity/PlatformSettingsEntity";

@EntityRepository(PlatformSettingsEntity)
export class PlatformSettingsRepository extends Repository<PlatformSettingsEntity> {
    public async findSettingsByKey(key: string): Promise<PlatformSettingsEntity | undefined> {
        return await this.createQueryBuilder().where("key = :key").setParameter("key", key).getOne();
    }

    public async findPublicSettingsByKey(key: string): Promise<PlatformSettingsEntity | undefined> {
        return await this.createQueryBuilder()
            .where("key = :key and is_public IS TRUE")
            .setParameter("key", key)
            .getOne();
    }
}
