import { EntityManager, EntityRepository, In } from "typeorm";
import { GroupCatalogPermissionEntity } from "../entity/GroupCatalogPermissionEntity";
import { Permission } from "../generated/graphql";
import { AUTHENTICATED_USER_OR_PUBLIC_CATALOG_QUERY } from "./CatalogRepository";

@EntityRepository()
export class GroupCatalogPermissionRepository {
    // eslint-disable-next-line no-useless-constructor
    constructor(private manager: EntityManager) {
        // nothing to do
    }

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
                '"groupCatalogPermission"."group_id" IN (SELECT "groupUser"."group_id" FROM "group_user" "groupUser" WHERE "groupUser"."user_id" = :userId)'
            )
            .setParameter("userId", userId)
            .addRelations(ALIAS, relations)
            .getMany();
    }

    async createOrUpdateGroupCatalogPermission({
        creatorId,
        catalogId,
        groupId,
        permissions,
        packagePermissions,
        relations = []
    }: {
        creatorId: number;
        catalogId: number;
        groupId: number;
        permissions: Permission[];
        packagePermissions: Permission[];
        relations?: string[];
    }): Promise<GroupCatalogPermissionEntity> {
        const entity = await this.manager.getRepository(GroupCatalogPermissionEntity).findOne({
            where: {
                catalogId,
                groupId
            },
            relations
        });

        if (entity) {
            entity.permissions = permissions;
            entity.packagePermissions = packagePermissions;
            return this.manager.save(entity);
        }

        const groupPermission = this.manager.getRepository(GroupCatalogPermissionEntity).create({
            groupId,
            catalogId,
            permissions,
            creatorId,
            packagePermissions
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

    async catalogPermissionsByGroupForUser({
        groupId,
        userId,
        relations = []
    }: {
        groupId: number;
        userId: number;
        relations?: string[];
    }): Promise<GroupCatalogPermissionEntity[]> {
        const ALIAS = "groupCatalogPermission";
        return this.manager
            .getRepository(GroupCatalogPermissionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ groupId })
            .andWhere(
                '("groupCatalogPermission"."catalog_id" IN (SELECT "CatalogEntity"."id" FROM "catalog" "CatalogEntity" WHERE ' +
                    AUTHENTICATED_USER_OR_PUBLIC_CATALOG_QUERY +
                    "))",
                {
                    userId,
                    permission: Permission.VIEW
                }
            )
            .getMany();
    }
}
