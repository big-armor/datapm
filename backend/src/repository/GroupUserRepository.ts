import { EntityManager, EntityRepository } from "typeorm";
import { GroupUserEntity } from "../entity/GroupUserEntity";
import { Permission } from "../generated/graphql";

@EntityRepository()
export class GroupUserRepository {
    // eslint-disable-next-line no-useless-constructor
    constructor(private manager: EntityManager) {
        // nothing to do
    }

    async findByUserId({
        userId,
        relations = []
    }: {
        userId: number;
        relations?: string[];
    }): Promise<GroupUserEntity | undefined> {
        const ALIAS = "groupUserEntity";
        return this.manager
            .getRepository(GroupUserEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ userId })
            .getOne();
    }

    async addOrUpdateUserToGroup({
        userId,
        creatorId,
        groupId,
        permissions,
        relations = []
    }: {
        userId: number;
        creatorId: number;
        groupId: number;
        permissions: Permission[];
        relations?: string[];
    }): Promise<GroupUserEntity> {
        const ALIAS = "groupUserEntity";

        const entity = await this.manager.getRepository(GroupUserEntity).findOne({
            where: {
                userId,
                groupId
            },
            relations
        });

        if (entity) {
            entity.permissions = permissions;
            return this.manager.save(entity);
        }

        const groupPermission = this.manager.getRepository(GroupUserEntity).create({
            groupId,
            userId,
            creatorId,
            permissions
        });

        await this.manager.save(groupPermission);

        return await this.manager.getRepository(GroupUserEntity).findOneOrFail({
            where: {
                userId,
                groupId
            },
            relations
        });
    }
}
