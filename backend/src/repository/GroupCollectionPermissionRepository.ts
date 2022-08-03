import { EntityManager, EntityRepository, In } from "typeorm";
import { GroupCollectionPermissionEntity } from "../entity/GroupCollectionPermissionEntity";
import { Permission } from "../generated/graphql";

@EntityRepository()
export class GroupCollectionPermissionRepository {
    constructor(private manager: EntityManager) {}

    async getCollectionPermissionsByUser({
        collectionId,
        userId,
        relations = []
    }: {
        collectionId: number;
        userId: number;
        relations?: string[];
    }): Promise<GroupCollectionPermissionEntity[]> {
        const ALIAS = "groupCollectionPermission";
        return this.manager
            .getRepository(GroupCollectionPermissionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ collectionId })
            .andWhere(
                '"groupCollectionPermission"."group_id" IN (SELECT "groupUser"."group_id" FROM "group_user" "groupUser" WHERE "groupUser"."user_id" = :userId)',
            )
            .setParameter("userId", userId)
            .getMany();
    }

    async createOrUpdateGroupCollectionPermission({
        collectionId,
        groupId,
        permissions,
        relations = []
    }: {
        collectionId: number;
        groupId: number;
        permissions: Permission[],
        relations?: string[];
    }): Promise<GroupCollectionPermissionEntity> {

        const entity = await this.manager.getRepository(GroupCollectionPermissionEntity).findOne({
            where: {
                collectionId,
                groupId
            },
            relations
        });

        if(entity) {
            entity.permissions = permissions;
            return this.manager.save(entity);
        }


        const groupPermission =  this.manager.getRepository(GroupCollectionPermissionEntity).create({
            groupId,
            collectionId,
            permissions
        });

        await this.manager.save(groupPermission);

        return await this.manager.getRepository(GroupCollectionPermissionEntity).findOneOrFail({
            where: {
                collectionId,
                groupId
            },
            relations
        });

    }
}