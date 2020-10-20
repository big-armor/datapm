import { EntityRepository, Repository } from "typeorm";

import { Permission } from "../generated/graphql";
import { UserCollectionPermission } from "../entity/UserCollectionPermission";

@EntityRepository(UserCollectionPermission)
export class UserCollectionPermissionRepository extends Repository<UserCollectionPermission> {
    public async grantAllPermissionsForUser(userId: number, collectionId: number): Promise<UserCollectionPermission> {
        return this.setPermissionsForUser(userId, collectionId, [Permission.VIEW, Permission.EDIT, Permission.MANAGE]);
    }

    public async setPermissionsForUser(
        userId: number,
        collectionId: number,
        permissions: Permission[]
    ): Promise<UserCollectionPermission> {
        const permissionEntity = new UserCollectionPermission();
        permissionEntity.collectionId = collectionId;
        permissionEntity.userId = userId;
        permissionEntity.permissions = permissions;
        return this.save(permissionEntity);
    }

    public async hasPermission(userId: number, collectionId: number, permission: Permission): Promise<boolean> {
        const permissionsEntity = await this.findByUserAndCollectionId(userId, collectionId);
        if (!permissionsEntity) {
            return false;
        }

        return permissionsEntity.permissions.some((p) => p === permission);
    }

    public async findByUserId(userId: number): Promise<UserCollectionPermission[]> {
        return this.createQueryBuilder().where({ userId: userId }).getMany();
    }

    public async findByUserAndCollectionId(
        userId: number,
        collectionId: number
    ): Promise<UserCollectionPermission | undefined> {
        return this.createQueryBuilder().where({ userId: userId, collectionId: collectionId }).getOne();
    }
}
