import querystring from "querystring";

import { EntityRepository, Repository, EntityManager, SelectQueryBuilder } from "typeorm";
import { v4 as uuid } from "uuid";

import { User } from "../entity/User";
import {
    CreateUserInputAdmin,
    Permission,
    UpdateUserInput,
    CreateUserInput,
    RecoverMyPasswordInput
} from "../generated/graphql";
import { mixpanel } from "../util/mixpanel";
import { UserCatalogPermission } from "../entity/UserCatalogPermission";
import { CatalogRepository } from "./CatalogRepository";
import { hashPassword } from "../util/PasswordUtil";
import { Catalog } from "../entity/Catalog";
import { sendVerifyEmail, sendForgotPasswordEmail, smtpConfigured } from "../util/smtpUtil";
import { ValidationError, UserInputError } from "apollo-server";
import { ImageStorageService } from "../storage/images/image-storage-service";
import { CollectionRepository } from "./CollectionRepository";
import { StorageErrors } from "../storage/files/file-storage-service";
// https://stackoverflow.com/a/52097700
export function isDefined<T>(value: T | undefined | null): value is T {
    return <T>value !== undefined && <T>value !== null;
}

export interface UserCatalogInput {
    catalogId: number;
    permission: Permission[];
}

const SELECTED_WORKPAD_REGEX = /^selected_workpad_id_person_(\d+)$/;

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

async function getUser({
    username,
    manager,
    relations = []
}: {
    username: string;
    catalogId?: number;
    manager: EntityManager;
    relations?: string[];
}): Promise<User | null> {
    const ALIAS = "users";
    let query = manager
        .getRepository(User)
        .createQueryBuilder(ALIAS)
        .where({ username: username })
        .addRelations(ALIAS, relations);

    const val = await query.getOne();

    return val || null;
}

async function getUserByUserName({
    username,
    manager,
    relations = []
}: {
    username: string;
    manager: EntityManager;
    relations?: string[];
}): Promise<User | null> {
    const ALIAS = "users";
    let query = manager
        .getRepository(User)
        .createQueryBuilder(ALIAS)
        .where({ username: username })
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
}): Promise<User> {
    const user = await getUser({
        username,
        manager,
        relations
    });
    if (!user) throw new Error(`Failed to get user ${username}`);
    return user;
}

async function getUserByUsernameOrFail({
    username,
    manager,
    relations = []
}: {
    username: string;
    manager: EntityManager;
    relations?: string[];
}): Promise<User> {
    const user = await getUserByUserName({
        username,
        manager,
        relations
    });
    if (!user) throw new Error(`Failed to get user ${username}`);
    return user;
}

function getUserProfilePicture(userId: number) {
    return `user/${userId}/icon/${uuid()}`; // each profile picture needs its unique path to "invalidate" browser cache
}

function getCatalogPicture(catalogId: number) {
    return `catalog/${catalogId}/icon/${uuid()}`; // each profile picture needs its unique path to "invalidate" browser cache
}

function addUserToMixpanel(user: User, invitedByUserEmail: string) {
    mixpanel?.people.set(user.emailAddress, {
        $first_name: user.firstName,
        $last_name: user.firstName,
        $email: user.emailAddress,
        $created: user.createdAt.toISOString(),
        roles: user.catalogPermissions.flatMap((c) => c.permissions) ?? "['None']",
        invited_by_user: invitedByUserEmail
    });
}

@EntityRepository(User)
export class UserRepository extends Repository<User> {
    constructor() {
        super();
    }

    getUserByUsername(username: string) {
        const ALIAS = "getUsername";

        const user = this.createQueryBuilder(ALIAS).where([{ username }]).getOne();

        return user;
    }

    findByEmailValidationToken(token: String) {
        const ALIAS = "getUsername";

        const user = this.createQueryBuilder(ALIAS)
            .where([{ verifyEmailToken: token }])
            .getOne();

        return user;
    }

    async getUserByEmail(emailAddress: string) {
        const ALIAS = "getByEmailAddress";

        const user = await this.createQueryBuilder(ALIAS).where([{ emailAddress }]).getOne();
        return user;
    }

    getUserByLogin(username: string, relations: string[] = []) {
        const ALIAS = "getByLogin";

        const user = this.createQueryBuilder(ALIAS)
            .where([{ username }, { emailAddress: username }])
            .addRelations(ALIAS, relations)
            .getOne();

        return user;
    }

    findMe({ id, relations = [] }: { id: number; relations?: string[] }) {
        return this.findOneOrFail({
            where: { id: id },
            relations: relations
        });
    }

    async findUser({ username, relations = [] }: { username: string; catalogId?: number; relations?: string[] }) {
        return getUserOrFail({
            username: username,
            manager: this.manager,
            relations
        });
    }

    findUserByUserName({ username, relations = [] }: { username: string; relations?: string[] }) {
        return getUserByUsernameOrFail({
            username: username,
            manager: this.manager,
            relations
        });
    }

    findUsers({ relations = [] }: { relations?: string[] }) {
        const ALIAS = "users";
        return this.manager.getRepository(User).createQueryBuilder(ALIAS).addRelations(ALIAS, relations).getMany();
    }

    findAllUsers(relations: string[] = []) {
        const ALIAS = "users";
        return this.manager.getRepository(User).createQueryBuilder(ALIAS).addRelations(ALIAS, relations).getMany();
    }

    createUser({ value, relations = [] }: { value: CreateUserInput; relations?: string[] }): Promise<User> {
        const self: UserRepository = this;
        const isAdmin = (input: CreateUserInput | CreateUserInputAdmin): input is CreateUserInputAdmin => {
            return (input as CreateUserInputAdmin) !== undefined;
        };

        let emailVerificationToken = uuid();

        return this.manager
            .nestedTransaction(async (transaction) => {
                let user = transaction.create(User);

                if (value.firstName != null) user.firstName = value.firstName.trim();

                if (value.lastName != null) user.lastName = value.lastName.trim();

                user.emailAddress = value.emailAddress.trim();
                user.username = value.username.trim();
                user.passwordSalt = uuid();
                user.passwordHash = hashPassword(value.password, user.passwordSalt);

                user.verifyEmailToken = emailVerificationToken;
                user.verifyEmailTokenDate = new Date();
                user.emailVerified = false;

                const now = new Date();
                user.createdAt = now;
                user.updatedAt = now;

                if (isAdmin(value) && value.isAdmin) {
                    user.isAdmin = value.isAdmin;
                } else {
                    user.isAdmin = false;
                }

                user = await transaction.save(user);

                const catalog = await transaction.getCustomRepository(CatalogRepository).createCatalog({
                    username: user.username,
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
            .then(async (user: User) => {
                await sendVerifyEmail(user, emailVerificationToken);

                return getUserOrFail({
                    username: value.username,
                    manager: self.manager,
                    relations
                });
            });
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

    forgotMyPassword({ user }: { user: User }): Promise<User> {
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
            .then(async (user: User) => {
                await sendForgotPasswordEmail(user, user.passwordRecoveryToken);
                return getUserOrFail({
                    username: user.username,
                    manager: this.manager
                });
            });
    }

    recoverMyPassword({ user, value }: { user: User; value: RecoverMyPasswordInput }): Promise<User> {
        return this.manager
            .nestedTransaction(async (transaction) => {
                const dbUser = await getUserByUsernameOrFail({
                    username: user.username,
                    manager: transaction
                });

                // return error if current user token is not the same as input token
                if (dbUser.passwordRecoveryToken != value.token) throw new UserInputError("TOKEN_NOT_VALID");

                // return error if token is more than 4 hours expired
                if (dbUser.passwordRecoveryToken && dbUser.passwordRecoveryTokenDate) {
                    const moreThanFourHours =
                        new Date().getMilliseconds() - dbUser.passwordRecoveryTokenDate.getMilliseconds() >
                        4 * 60 * 60 * 1000;

                    if (moreThanFourHours) throw new UserInputError("TOKEN_NOT_VALID");
                }

                const newPasswordHash = hashPassword(value.newPassword, dbUser.passwordSalt);
                dbUser.passwordHash = newPasswordHash;

                await transaction.save(dbUser);
                return dbUser;
            })
            .then(async (user: User) => {
                return getUserOrFail({
                    username: user.username,
                    manager: this.manager
                });
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
    }): Promise<User> {
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

            const finalUserName = value.username;
            if (value.username) {
                dbUser.username = value.username.toLowerCase().trim();
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

    async deleteUser({ username }: { username: string }): Promise<void> {
        const user = await getUserByUsernameOrFail({
            username: username,
            manager: this.manager
        });

        await this.manager.getCustomRepository(CatalogRepository).deleteCatalog({ slug: username });

        const collections = await this.manager.getCustomRepository(CollectionRepository).findByUser(user.id);

        for (const collection of collections)
            await this.manager.getCustomRepository(CollectionRepository).deleteCollection(collection.collectionSlug);

        await this.manager.nestedTransaction(async (transaction) => {
            await transaction.delete(User, { username: (await user).username });
        });

        try {
            await ImageStorageService.INSTANCE.deleteUserAvatarImage(username);
        } catch (error) {
            if (error.message == StorageErrors.FILE_DOES_NOT_EXIST) return;

            console.error(error.message);
        }

        try {
            await ImageStorageService.INSTANCE.deleteUserCoverImage(username);
        } catch (error) {
            if (error.message == StorageErrors.FILE_DOES_NOT_EXIST) return;

            console.error(error.message);
        }
    }

    removeUserFromCatalog({
        username,
        catalog,
        relations = []
    }: {
        username: string;
        catalog: Catalog;
        relations?: string[];
    }): Promise<User> {
        return this.manager.nestedTransaction(async (transaction) => {
            const user = await getUserByUsernameOrFail({
                username: username,
                manager: transaction
            });

            // remove user from catalog, remove all user settings
            await transaction.delete(UserCatalogPermission, { userId: user.id, catalogId: catalog.id });

            user.updatedAt = new Date();
            await transaction.save(user);

            // return result with requested relations
            return getUserByUsernameOrFail({
                username: username,
                manager: transaction,
                relations
            });
        });
    }
}
