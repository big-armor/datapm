import { EntityManager, EntityRepository, Repository } from "typeorm";

import {
    Permission,
    CollectionIdentifierInput,
    SetUserCollectionPermissionsInput,
    UserCollectionPermissions
} from "../generated/graphql";
import { UserCollectionPermissionEntity } from "../entity/UserCollectionPermissionEntity";
import { UserEntity } from "../entity/UserEntity";
import { CollectionEntity } from "../entity/CollectionEntity";

import { UserRepository } from "./UserRepository";
import { CollectionRepository } from "./CollectionRepository";

export async function getAllCollectionPermissions(
    manager: EntityManager,
    collectionId: number,
    relations?: string[]
): Promise<UserCollectionPermissionEntity[]> {
    const ALIAS = "userCollectionPermission";
    return manager
        .getRepository(UserCollectionPermissionEntity)
        .createQueryBuilder(ALIAS)
        .addRelations(ALIAS, relations)
        .where({ collectionId })
        .getMany();
}

@EntityRepository(UserCollectionPermissionEntity)
export class UserCollectionPermissionRepository extends Repository<UserCollectionPermissionEntity> {
    findCollectionPermissions({
        collectionId,
        userId,
        relations = []
    }: {
        collectionId: number;
        userId: number;
        relations?: string[];
    }): Promise<UserCollectionPermissionEntity | undefined> {
        const ALIAS = "userCollectionPermission";
        return this.manager
            .getRepository(UserCollectionPermissionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ collectionId, userId })
            .getOne();
    }

    public async grantAllPermissionsForUser(
        userId: number,
        collectionId: number
    ): Promise<UserCollectionPermissionEntity> {
        return this.setPermissionsForUser(userId, collectionId, [Permission.VIEW, Permission.EDIT, Permission.MANAGE]);
    }

    public async setPermissionsForUser(
        userId: number,
        collectionId: number,
        permissions: Permission[]
    ): Promise<UserCollectionPermissionEntity> {
        const permissionEntity = new UserCollectionPermissionEntity();
        permissionEntity.collectionId = collectionId;
        permissionEntity.userId = userId;
        permissionEntity.permissions = permissions;
        return this.save(permissionEntity);
    }

    public async hasPermission(userId: number, collection: CollectionEntity, permission: Permission): Promise<boolean> {
        if (permission === Permission.VIEW && collection.isPublic) {
            return true;
        }

        const permissionsEntity = await this.findByUserAndCollectionId(userId, collection.id);
        if (!permissionsEntity) {
            return false;
        }

        return permissionsEntity.permissions.some((p) => p === permission);
    }

    public async findByUserId(userId: number): Promise<UserCollectionPermissionEntity[]> {
        return this.createQueryBuilder().where({ userId: userId }).getMany();
    }

    public async findByUserAndCollectionId(
        userId: number,
        collectionId: number
    ): Promise<UserCollectionPermissionEntity | undefined> {
        return this.createQueryBuilder().where({ userId: userId, collectionId: collectionId }).getOne();
    }

    public async usersByCollection(
        collectionEntity: CollectionEntity,
        relations?: string[]
    ): Promise<UserCollectionPermissions[]> {
        const ALIAS = "userCollectionPermission";

        return await this.manager
            .getRepository(UserCollectionPermissionEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .where({ collectionId: collectionEntity.id })
            .getMany();
    }

    public async setUserCollectionPermissions({
        identifier,
        value,
        relations
    }: {
        identifier: CollectionIdentifierInput;
        value: SetUserCollectionPermissionsInput;
        relations?: string[];
    }): Promise<void> {
        await this.manager.nestedTransaction(async (transaction) => {
            const user = await transaction
                .getCustomRepository(UserRepository)
                .getUserByUsernameOrEmailAddress(value.usernameOrEmailAddress);

            if (!user) {
                throw new Error(`USER_NOT_FOUND - ${value.usernameOrEmailAddress}`);
            }

            const collectionEntity = await transaction
                .getCustomRepository(CollectionRepository)
                .findCollectionBySlugOrFail(identifier.collectionSlug);

            if (user.id === collectionEntity.creatorId) throw new Error(`CANNOT_SET_COLLECTION_CREATOR_PERMISSIONS`);

            const permissions = await this.findByUserAndCollectionId(user.id, collectionEntity.id);

            // If permission input is not empty
            if (value.permissions.length > 0) {
                // If user does not exist in collection permissions, it creates new record
                if (permissions === undefined) {
                    try {
                        const collectionPermissionEntry = transaction.create(UserCollectionPermissionEntity);
                        collectionPermissionEntry.userId = user.id;
                        collectionPermissionEntry.collectionId = collectionEntity.id;
                        collectionPermissionEntry.permissions = value.permissions;
                        await transaction.save(collectionPermissionEntry);
                    } catch (e) {
                        console.log(e);
                    }
                }
                // If user does exists in collection permissions, it updates the record found
                else {
                    try {
                        await transaction
                            .createQueryBuilder()
                            .update(UserCollectionPermissionEntity)
                            .set({ permissions: value.permissions })
                            .where({ collectionId: collectionEntity.id, userId: user.id })
                            .execute();
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
            // If the permissions input is empty, it will delete the row in collection permissions
            else {
                // If the permissions row exists in the table delete it
                if (permissions != null) {
                    try {
                        await transaction
                            .createQueryBuilder()
                            .delete()
                            .from(UserCollectionPermissionEntity)
                            .where({ collectionId: collectionEntity.id, userId: user.id })
                            .execute();
                    } catch (e) {
                        console.log(e);
                    }
                }
            }
        });
    }

    deleteUserCollectionPermissionsForUser({
        identifier,
        user
    }: {
        identifier: CollectionIdentifierInput;
        user: UserEntity;
        relations?: string[];
    }): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const collectionEntity = await transaction
                .getCustomRepository(CollectionRepository)
                .findCollectionBySlugOrFail(identifier.collectionSlug);

            if (collectionEntity.creatorId === user.id) {
                throw new Error("CANNOT_REMOVE_CREATOR_PERMISSIONS");
            }

            await transaction.delete(UserCollectionPermissionEntity, {
                collectionId: collectionEntity.id,
                userId: user.id
            });
        });
    }
}
