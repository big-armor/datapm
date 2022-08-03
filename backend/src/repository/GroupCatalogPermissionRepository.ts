import { EntityManager, EntityRepository, In } from "typeorm";
import { GroupCatalogPermissionEntity } from "../entity/GroupCatalogPermissionEntity";
import { Permission } from "../generated/graphql";

@EntityRepository()
export class GroupCatalogPermissionRepository {
    constructor(private manager: EntityManager) {}

    async getCatalogPermissionsByUser({
        catalogId,
        userId,
        relations = []
    }: {
        catalogId: number;
        userId: number;
        relations?: string[];
    }): Promise<GroupCatalogPermissionEntity[]> {
        const ALIAS = "groupCatalogPermission";
        return this.manager
            .getRepository(GroupCatalogPermissionEntity)
            .createQueryBuilder(ALIAS)
            .where({ catalogId })
            .andWhere(
                '"groupCatalogPermission"."group_id" IN (SELECT "groupUser"."group_id" FROM "group_user" "groupUser" WHERE "groupUser"."user_id" = :userId)',
            )
            .setParameter("userId", userId)
            .addRelations(ALIAS, relations)
            .getMany();
    }

    async createOrUpdateGroupCatalogPermission({
        catalogId,
        groupId,
        permissions,
        relations = []
    }: {
        catalogId: number;
        groupId: number;
        permissions: Permission[],
        relations?: string[];
    }): Promise<GroupCatalogPermissionEntity> {

        const entity = await this.manager.getRepository(GroupCatalogPermissionEntity).findOne({
            where: {
                catalogId,
                groupId
            },
            relations
        });

        if(entity) {
            entity.permissions = permissions;
            return this.manager.save(entity);
        }


        const groupPermission =  this.manager.getRepository(GroupCatalogPermissionEntity).create({
            groupId,
            catalogId,
            permissions
        });

        await this.manager.save(groupPermission);

        return await this.manager.getRepository(GroupCatalogPermissionEntity).findOneOrFail({
            where: {
                catalogId,
                groupId
            },
            relations
        });

    }
}