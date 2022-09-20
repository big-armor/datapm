import { EntityManager, EntityRepository, In } from "typeorm";
import { GroupCollectionPermissionEntity } from "../entity/GroupCollectionPermissionEntity";
import { Permission } from "../generated/graphql";
import { AUTHENTICATED_USER_OR_PUBLIC_COLLECTIONS_QUERY } from "./CollectionRepository";

@EntityRepository()
export class GroupCollectionPermissionRepository {
    // eslint-disable-next-line no-useless-constructor
    constructor(private manager: EntityManager) {
        // nothing to do
    }

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
                '"groupCollectionPermission"."group_id" IN (SELECT "groupUser"."group_id" FROM "group_user" "groupUser" WHERE "groupUser"."user_id" = :userId)'
            )
            .setParameter("userId", userId)
            .getMany();
    }

    async createOrUpdateGroupCollectionPermission({
        creatorId,
        collectionId,
        groupId,
        permissions,
        relations = []
    }: {
        creatorId: number;
        collectionId: number;
        groupId: number;
        permissions: Permission[];
        relations?: string[];
    }): Promise<GroupCollectionPermissionEntity> {
        const entity = await this.manager.getRepository(GroupCollectionPermissionEntity).findOne({
            where: {
                collectionId,
                groupId
            },
            relations
        });

        if (entity) {
            entity.permissions = permissions;
            return this.manager.save(entity);
        }

        const groupPermission = this.manager.getRepository(GroupCollectionPermissionEntity).create({
            groupId,
            collectionId,
            permissions,
            creatorId
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

    async collectionPermissionsByGroupForUser({
        groupId,
        userId,
        relations = []
    }: {
        groupId: number;
        userId: number;
        relations?: string[];
    }): Promise<GroupCollectionPermissionEntity[]> {
        const ALIAS = "groupCollectionPermission";
        return this.manager
            .getRepository(GroupCollectionPermissionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ groupId })
            .andWhere(
                '("groupCollectionPermission"."collection_id" IN (SELECT "CollectionEntity"."id" FROM "collection" "CollectionEntity" WHERE ' +
                    AUTHENTICATED_USER_OR_PUBLIC_COLLECTIONS_QUERY +
                    "))",
                {
                    userId,
                    permission: Permission.VIEW
                }
            )
            .getMany();
    }
}
