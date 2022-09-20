import { EntityRepository, Repository } from "typeorm";
import { GroupEntity } from "../entity/GroupEntity";
import { UserEntity } from "../entity/UserEntity";

@EntityRepository(GroupEntity)
export class GroupRepository extends Repository<GroupEntity> {
    async searchWithNoRestrictions({
        value,
        limit,
        offSet,
        relations = []
    }: {
        value: string;
        limit: number;
        offSet: number;
        relations?: string[];
    }): Promise<[GroupEntity[], number]> {
        const ALIAS = "searchWithNoRestrictions";
        return await this.manager
            .getRepository(GroupEntity)
            .createQueryBuilder()
            .where(`(GroupEntity.name LIKE :valueLike OR GroupEntity.slug LIKE :valueLike)`, {
                value,
                valueLike: value + "%"
            })
            .addRelations(ALIAS, relations)
            .orderBy("id")
            .limit(limit)
            .offset(offSet)
            .getManyAndCount();
    }

    async userIsMemberOfAdminGroup(user: UserEntity): Promise<boolean> {
        return (
            (await this.manager
                .getRepository(GroupEntity)
                .createQueryBuilder("GroupEntity")
                .where(
                    '"GroupEntity"."is_admin" = true AND "GroupEntity"."id" IN (SELECT group_id FROM group_user WHERE user_id = :userId)'
                )
                .setParameter("userId", user.id)
                .getCount()) > 0
        );
    }
}
