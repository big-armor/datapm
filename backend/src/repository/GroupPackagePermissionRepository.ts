import { EntityManager, EntityRepository, In } from "typeorm";
import { GroupPackagePermissionEntity } from "../entity/GroupPackagePermissionEntity";
import { Permission } from "../generated/graphql";

@EntityRepository()
export class GroupPackagePermissionRepository {
    constructor(private manager: EntityManager) {}

    /** This is only in the context of a user's package permission via being a member of a group. But not via direct
     * package assignment, or through catalog level package permissions.
     */
    async getPackagePermissionsByUser({
        packageId,
        userId,
        relations = []
    }: {
        packageId: number;
        userId: number;
        relations?: string[];
    }): Promise<GroupPackagePermissionEntity[]> {
        const ALIAS = "groupPackagePermission";
        return this.manager
            .getRepository(GroupPackagePermissionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ packageId })
            .andWhere(
                '"groupPackagePermission"."group_id" IN (SELECT "groupUser"."group_id" FROM "group_user" "groupUser" WHERE "groupUser"."user_id" = :userId)',
            )
            .setParameter("userId", userId)
            .getMany();
    }


    async createOrUpdateGroupPackagePermission({
        creatorId,
        packageId,
        groupId,
        permissions,
        relations = []
    }: {
        creatorId: number;
        packageId: number;
        groupId: number;
        permissions: Permission[],
        relations?: string[];
    }): Promise<GroupPackagePermissionEntity> {

        const entity = await this.manager.getRepository(GroupPackagePermissionEntity).findOne({
            where: {
                packageId,
                groupId
            },
            relations
        });

        if(entity) {
            entity.permissions = permissions;
            return this.manager.save(entity);
        }


        const groupPermission =  this.manager.getRepository(GroupPackagePermissionEntity).create({
            groupId,
            packageId,
            creatorId,
            permissions
        });

        await this.manager.save(groupPermission);

        return await this.manager.getRepository(GroupPackagePermissionEntity).findOneOrFail({
            where: {
                packageId,
                groupId
            },
            relations
        });

    }
}