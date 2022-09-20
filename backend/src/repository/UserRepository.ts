import { EntityRepository, Repository, EntityManager, SelectQueryBuilder } from "typeorm";
import { v4 as uuid } from "uuid";

import { UserEntity } from "../entity/UserEntity";
import {
    CreateUserInputAdmin,
    UpdateUserInput,
    CreateUserInput,
    RecoverMyPasswordInput,
    UserStatus
} from "../generated/graphql";
import { CatalogRepository } from "./CatalogRepository";
import { hashPassword } from "../util/PasswordUtil";
import { sendVerifyEmail, sendForgotPasswordEmail } from "../util/smtpUtil";
import { UserInputError } from "apollo-server";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { CollectionRepository } from "./CollectionRepository";
import { StorageErrors } from "../storage/files/file-storage-service";
import { FirstUserStatusHolder } from "../resolvers/FirstUserStatusHolder";
import { ReservedKeywordsService } from "../service/reserved-keywords-service";
import { GroupRepository } from "./GroupRepository";

// https://stackoverflow.com/a/52097700
export function isDefined<T>(value: T | undefined | null): value is T {
    return <T>value !== undefined && <T>value !== null;
}

declare module "typeorm" {
    interface SelectQueryBuilder<Entity> {
        filterUserCatalog(topLevelAlias: string, catalogId: number): SelectQueryBuilder<Entity>;
    }
}

SelectQueryBuilder.prototype.filterUserCatalog = function (topLevelAlias: string, catalogId: number) {
    return this.innerJoin(`${topLevelAlias}.userCatalogs`, "uo", "uo.catalogId = :catalogId", {
        catalogId
    });
};

export async function getUserByUserName({
    username,
    manager,
    relations = []
}: {
    username: string;
    manager: EntityManager;
    relations?: string[];
}): Promise<UserEntity | null> {
    const ALIAS = "users";
    const query = manager
        .getRepository(UserEntity)
        .createQueryBuilder(ALIAS)
        .where(`LOWER(username) = :username`)
        .setParameter("username", username.toLowerCase())
        .addRelations(ALIAS, relations);

    const val = await query.getOne();

    return val || null;
}

async function getUserOrFail({
    username,
    manager,
    relations = []
}: {
    username: string;
    manager: EntityManager;
    relations?: string[];
}): Promise<UserEntity> {
    const user = await getUserByUserName({
        username,
        manager,
        relations
    });
    if (!user) throw new Error(`USER_NOT_FOUND - ${username}`);
    return user;
}

export async function getUserByUsernameOrFail({
    username,
    manager,
    relations = []
}: {
    username: string;
    manager: EntityManager;
    relations?: string[];
}): Promise<UserEntity> {
    const user = await getUserByUserName({
        username,
        manager,
        relations
    });
    if (!user) throw new Error(`USER_NOT_FOUND - ${username}`);
    return user;
}

function getUserProfilePicture(userId: number) {
    return `user/${userId}/icon/${uuid()}`; // each profile picture needs its unique path to "invalidate" browser cache
}

function getCatalogPicture(catalogId: number) {
    return `catalog/${catalogId}/icon/${uuid()}`; // each profile picture needs its unique path to "invalidate" browser cache
}

function addUserToMixpanel(user: UserEntity, invitedByUserEmail: string) {
    mixpanel?.people.set(user.emailAddress, {
        $first_name: user.firstName,
        $last_name: user.firstName,
        $email: user.emailAddress,
        $created: user.createdAt.toISOString(),
        roles: user.catalogPermissions.flatMap((c) => c.permissions) ?? "['None']",
        invited_by_user: invitedByUserEmail
    });
}

@EntityRepository(UserEntity)
export class UserRepository extends Repository<UserEntity> {
    public async isAtLeastOneUserRegistered(): Promise<boolean> {
        return (await this.createQueryBuilder().getOne()) != null;
    }

    async getUserByUsername(username: string): Promise<UserEntity | null> {
        const ALIAS = "getUsername";

        const user = await getUserByUserName({ username, manager: this.manager });

        return user;
    }

    async getUserByUsernameOrEmailAddress(username: string): Promise<UserEntity | undefined> {
        const ALIAS = "getUsername";

        const user = this.createQueryBuilder(ALIAS)
            .where(`LOWER(username) = :username`)
            .orWhere('(LOWER("getUsername"."emailAddress") = :username)')
            .setParameter("username", username.toLowerCase())
            .getOne();

        return user;
    }

    findByEmailValidationToken(token: string): Promise<UserEntity | undefined> {
        const ALIAS = "getUsername";

        const user = this.createQueryBuilder(ALIAS)
            .where([{ verifyEmailToken: token }])
            .getOne();

        return user;
    }

    getUserByEmail(emailAddress: string): Promise<UserEntity | undefined> {
        const ALIAS = "getByEmailAddress";

        const user = this.createQueryBuilder(ALIAS)
            .where(`LOWER("getByEmailAddress"."emailAddress") = :emailAddress`)
            .setParameter("emailAddress", emailAddress.toLowerCase())
            .getOne();
        return user;
    }

    getUserByLogin(username: string, relations: string[] = []): Promise<UserEntity | undefined> {
        const ALIAS = "getByLogin";

        const user = this.createQueryBuilder(ALIAS)
            .where(`LOWER("getByLogin"."emailAddress") = :username OR LOWER(username) = :username`)
            .setParameter("username", username.toLowerCase())
            .addRelations(ALIAS, relations)
            .getOne();

        return user;
    }

    findMe({ id, relations = [] }: { id: number; relations?: string[] }): Promise<UserEntity | undefined> {
        return this.findOneOrFail({
            where: { id: id },
            relations: relations
        });
    }

    async findUser({
        username,
        relations = []
    }: {
        username: string;
        catalogId?: number;
        relations?: string[];
    }): Promise<UserEntity> {
        return getUserOrFail({
            username: username,
            manager: this.manager,
            relations
        });
    }

    findUserByUserName({
        username,
        relations = []
    }: {
        username: string;
        relations?: string[];
    }): Promise<UserEntity | undefined> {
        return getUserByUsernameOrFail({
            username: username,
            manager: this.manager,
            relations
        });
    }

    findUserByUserNameOrFail({
        username,
        relations = []
    }: {
        username: string;
        relations?: string[];
    }): Promise<UserEntity> {
        const user = getUserByUsernameOrFail({
            username: username,
            manager: this.manager,
            relations
        });

        if (user == null) {
            throw new Error(`USER_NOT_FOUND - ${username}`);
        }

        return user;
    }

    async findUserByRecoveryPasswordToken(token: string): Promise<UserEntity | undefined> {
        const ALIAS = "getUserByRecoveryPasswordToken";
        const user = await this.createQueryBuilder(ALIAS).where({ passwordRecoveryToken: token }).getOne();

        return user;
    }

    findUsers({ relations = [] }: { relations?: string[] }): Promise<UserEntity[]> {
        const ALIAS = "users";
        return this.manager
            .getRepository(UserEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .getMany();
    }

    findAllUsers(relations: string[] = []): Promise<UserEntity[]> {
        const ALIAS = "users";
        return this.manager
            .getRepository(UserEntity)
            .createQueryBuilder(ALIAS)
            .addRelations(ALIAS, relations)
            .getMany();
    }

    async autocomplete({
        user,
        startsWith,
        relations = []
    }: {
        user: UserEntity | undefined;
        startsWith: string;
        relations?: string[];
    }): Promise<UserEntity[]> {
        const ALIAS = "autoCompleteUser";

        const entities = await this.manager
            .getRepository(UserEntity)
            .createQueryBuilder()
            .where(`(LOWER("UserEntity"."username") LIKE :valueLike)`)
            .orWhere(
                `("UserEntity"."emailAddressIsPublic" is true AND (LOWER("UserEntity"."emailAddress") LIKE :valueLike))`
            )
            .orWhere(
                `("UserEntity"."nameIsPublic" is true AND (LOWER("UserEntity"."first_name") LIKE :valueLike OR LOWER("UserEntity"."last_name") LIKE :valueLike))`
            )
            .setParameter("valueLike", startsWith.toLowerCase() + "%")
            .addRelations(ALIAS, relations)
            .getMany();

        return entities;
    }

    async search({
        value,
        limit,
        offSet,
        relations = []
    }: {
        value: string;
        limit: number;
        offSet: number;
        relations?: string[];
    }): Promise<[UserEntity[], number]> {
        const ALIAS = "search";
        return await this.manager
            .getRepository(UserEntity)
            .createQueryBuilder()
            .where('("UserEntity"."nameIsPublic")')
            .andWhere(
                `("UserEntity"."username" LIKE :valueLike OR "UserEntity"."emailAddress" LIKE :valueLike OR "UserEntity"."first_name" LIKE :valueLike OR "UserEntity"."last_name" LIKE :valueLike)`,
                {
                    value,
                    valueLike: value + "%"
                }
            )
            .addRelations(ALIAS, relations)
            .limit(limit)
            .offset(offSet)
            .getManyAndCount();
    }

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
    }): Promise<[UserEntity[], number]> {
        const ALIAS = "searchWithNoRestrictions";
        return await this.manager
            .getRepository(UserEntity)
            .createQueryBuilder()
            .where(
                `(UserEntity.username LIKE :valueLike OR UserEntity.emailAddress LIKE :valueLike OR UserEntity.firstName LIKE :valueLike OR UserEntity.lastName LIKE :valueLike)`,
                {
                    value,
                    valueLike: value + "%"
                }
            )
            .addRelations(ALIAS, relations)
            .orderBy("id")
            .limit(limit)
            .offset(offSet)
            .getManyAndCount();
    }

    createInviteUser(emailAddress: string): Promise<UserEntity> {
        return this.manager.nestedTransaction(async (transaction) => {
            const user = transaction.create(UserEntity);
            user.emailAddress = emailAddress.trim().toLowerCase();
            user.verifyEmailToken = uuid();
            user.verifyEmailTokenDate = new Date();
            user.passwordSalt = uuid();
            user.emailVerified = false;
            user.username = "invited-" + uuid().substring(0, 8);

            const now = new Date();
            user.createdAt = now;
            user.updatedAt = now;
            user.isAdmin = false;

            user.status = UserStatus.PENDING_SIGN_UP;

            return transaction.save(user);
        });
    }

    completeCreatedUser({
        user,
        value,
        relations = []
    }: {
        user: UserEntity;
        value: CreateUserInput;
        relations?: string[];
    }): Promise<UserEntity> {
        // eslint-disable-next-line @typescript-eslint/no-this-alias
        const self: UserRepository = this;
        const isAdmin = (input: CreateUserInput | CreateUserInputAdmin): input is CreateUserInputAdmin => {
            return (input as CreateUserInputAdmin) !== undefined;
        };

        ReservedKeywordsService.validateReservedKeyword(value.username);
        const emailVerificationToken = uuid();
        return (
            this.manager
                .nestedTransaction(async (transaction) => {
                    if (value.firstName != null) user.firstName = value.firstName.trim();

                    if (value.lastName != null) user.lastName = value.lastName.trim();

                    user.emailAddress = value.emailAddress.trim();
                    user.username = value.username.trim();
                    user.passwordSalt = uuid();
                    user.passwordHash = hashPassword(value.password, user.passwordSalt);

                    user.verifyEmailToken = emailVerificationToken;
                    user.verifyEmailTokenDate = new Date();

                    if (user.emailVerified == null) user.emailVerified = false;

                    const now = new Date();
                    user.createdAt = now;
                    user.updatedAt = now;

                    user.uiDarkModeEnabled = value.uiDarkModeEnabled || false;

                    user.status = UserStatus.ACTIVE;

                    if (!FirstUserStatusHolder.IS_FIRST_USER_CREATED) {
                        FirstUserStatusHolder.IS_FIRST_USER_CREATED = await this.isAtLeastOneUserRegistered();
                    }

                    if (!FirstUserStatusHolder.IS_FIRST_USER_CREATED || (isAdmin(value) && value.isAdmin)) {
                        user.isAdmin = true;
                    } else {
                        user.isAdmin = false;
                    }

                    user = await transaction.save(user);
                    await transaction.getCustomRepository(CatalogRepository).createCatalog({
                        userId: user.id,
                        value: {
                            description: "",
                            isPublic: false,
                            displayName: user.username,
                            slug: user.username,
                            website: user.website
                        }
                    });

                    return user;
                })

                // FIX ME this should just use an await above, and handled errors in sendVerifyEmail
                .then(async (user: UserEntity) => {
                    if (!user.emailVerified) await sendVerifyEmail(user, emailVerificationToken);

                    return getUserOrFail({
                        username: value.username,
                        manager: self.manager,
                        relations
                    });
                })
        );
    }

    updateUserPassword({ username, passwordHash }: { username: string; passwordHash: string }): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const dbUser = await getUserByUsernameOrFail({
                username,
                manager: transaction
            });

            dbUser.passwordHash = passwordHash;
            await transaction.save(dbUser);
        });
    }

    forgotMyPassword({ user }: { user: UserEntity }): Promise<void> {
        return this.manager
            .nestedTransaction(async (transaction) => {
                const dbUser = await getUserByUsernameOrFail({
                    username: user.username,
                    manager: transaction
                });

                dbUser.passwordRecoveryToken = uuid();
                dbUser.passwordRecoveryTokenDate = new Date();

                await transaction.save(dbUser);
                return dbUser;
            })
            .then(async (user: UserEntity) => {
                await sendForgotPasswordEmail(user, user.passwordRecoveryToken as string);
            });
    }

    recoverMyPassword({ value }: { value: RecoverMyPasswordInput }): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const dbUser = await this.findUserByRecoveryPasswordToken(value.token);

            // // return error if current user token is not the same as input token
            if (dbUser?.passwordRecoveryToken !== value.token) throw new UserInputError("TOKEN_NOT_VALID");

            // return error if token is more than 4 hours expired
            if (dbUser.passwordRecoveryToken && dbUser.passwordRecoveryTokenDate) {
                const moreThanFourHours =
                    new Date().getMilliseconds() - dbUser.passwordRecoveryTokenDate.getMilliseconds() >
                    4 * 60 * 60 * 1000;

                if (moreThanFourHours) throw new UserInputError("TOKEN_NO_LONGER_VALID");
            }

            const newPasswordHash = hashPassword(value.newPassword, dbUser.passwordSalt);
            dbUser.passwordHash = newPasswordHash;
            dbUser.passwordRecoveryToken = null;

            await transaction.save(dbUser);
        });
    }

    public updateUserAdminStatus({ username, isAdmin }: { username: string; isAdmin: boolean }): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const dbUser = await getUserByUsernameOrFail({
                username,
                manager: transaction
            });

            dbUser.isAdmin = isAdmin;
            await transaction.save(dbUser);
        });
    }

    public updateUserStatus(username: string, status: UserStatus): Promise<void> {
        return this.manager.nestedTransaction(async (transaction) => {
            const dbUser = await getUserByUsernameOrFail({
                username,
                manager: transaction
            });

            dbUser.status = status;
            await transaction.save(dbUser);
        });
    }

    updateUser({
        username,
        value,
        relations = []
    }: {
        username: string;
        value: UpdateUserInput;
        relations?: string[];
    }): Promise<UserEntity> {
        if (value.username) {
            ReservedKeywordsService.validateReservedKeyword(value.username);
        }
        return this.manager.nestedTransaction(async (transaction) => {
            const dbUser = await getUserByUsernameOrFail({
                username,
                manager: transaction,
                relations: [...relations]
            });

            if (value.firstName) {
                dbUser.firstName = value.firstName.trim();
            }

            if (value.lastName) {
                dbUser.lastName = value.lastName.trim();
            }

            if (value.username) {
                const finalUserName = value.username.toLowerCase().trim();
                const oldUserName = dbUser.username;

                const catalog = await transaction
                    .getCustomRepository(CatalogRepository)
                    .findCatalogBySlugOrFail(oldUserName);
                catalog.slug = finalUserName;
                await transaction.save(catalog);

                dbUser.username = finalUserName;
            }

            if (value.emailAddress) {
                dbUser.emailAddress = value.emailAddress.trim();
            }

            if (value.nameIsPublic != null) {
                dbUser.nameIsPublic = value.nameIsPublic;
            }

            if (value.twitterHandle != null) {
                dbUser.twitterHandle = value.twitterHandle;
            }

            if (value.twitterHandleIsPublic != null) {
                dbUser.twitterHandleIsPublic = value.twitterHandleIsPublic;
            }

            if (value.gitHubHandle != null) {
                dbUser.gitHubHandle = value.gitHubHandle;
            }

            if (value.gitHubHandleIsPublic != null) {
                dbUser.gitHubHandleIsPublic = value.gitHubHandleIsPublic;
            }

            if (value.location != null) {
                dbUser.location = value.location;
            }

            if (value.locationIsPublic != null) {
                dbUser.locationIsPublic = value.locationIsPublic;
            }

            if (value.website != null) {
                dbUser.website = value.website;
            }

            if (value.websiteIsPublic != null) {
                dbUser.websiteIsPublic = value.websiteIsPublic;
            }

            if (value.emailAddressIsPublic != null) {
                dbUser.emailAddressIsPublic = value.emailAddressIsPublic;
            }

            if (value.description != null) {
                dbUser.description = value.description;
            }

            if (value.uiDarkModeEnabled != null) {
                dbUser.uiDarkModeEnabled = value.uiDarkModeEnabled;
            }

            dbUser.updatedAt = new Date();
            await transaction.save(dbUser);

            // return result with requested relations
            return getUserByUsernameOrFail({
                username: dbUser.username,
                manager: transaction,
                relations
            });
        });
    }

    async deleteUser(user: UserEntity): Promise<void> {
        // If user doesn't have a username it means that they have not yet signed up and don't have any catalogs/collections/images
        if (!user.username) {
            await this.manager.nestedTransaction(async (transaction) => {
                await transaction.delete(UserEntity, { id: user.id });
            });
            return;
        }

        await this.manager.getCustomRepository(CatalogRepository).deleteCatalog({ slug: user.username });
        const collections = await this.manager.getCustomRepository(CollectionRepository).findByUser(user.id);

        for (const collection of collections) {
            await this.manager.getCustomRepository(CollectionRepository).deleteCollection(collection.collectionSlug);
        }

        await this.manager.nestedTransaction(async (transaction) => {
            await transaction.delete(UserEntity, { id: user.id });
        });

        try {
            await ImageStorageService.INSTANCE.deleteUserAvatarImage(user.id);
        } catch (error) {
            if (error.message.includes(StorageErrors.FILE_DOES_NOT_EXIST)) return;
            console.error(error.message);
        }

        try {
            await ImageStorageService.INSTANCE.deleteUserCoverImage(user.id);
        } catch (error) {
            if (error.message.includes(StorageErrors.FILE_DOES_NOT_EXIST)) return;
            console.error(error.message);
        }
    }

    async getMaxInstantUserNotificationDate(): Promise<Date> {
        const response = await this.query('SELECT MAX(u.last_instant_notification) FROM "user" u');

        const value = response[0].max as Date;

        return value || new Date();
    }

    async userIsAdmin(user: UserEntity): Promise<boolean> {
        if (user.isAdmin) return true;

        return this.manager.getCustomRepository(GroupRepository).userIsMemberOfAdminGroup(user);
    }
}
