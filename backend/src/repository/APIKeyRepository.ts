import querystring from "querystring";

import { EntityRepository, Repository, EntityManager } from "typeorm";
import { v4 as uuidv4 } from "uuid";

import { UserEntity } from "../entity/UserEntity";

import { APIKeyEntity } from "../entity/APIKeyEntity";
import { hashPassword } from "../util/PasswordUtil";
import { APIKeyWithSecret, Scope } from "../generated/graphql";
import { ValidationError } from "apollo-server";

// https://stackoverflow.com/a/52097700
export function isDefined<T>(value: T | undefined | null): value is T {
    return <T>value !== undefined && <T>value !== null;
}

async function getAPIKey({
    id,
    manager,
    relations = []
}: {
    id: string;
    catalogId?: number;
    manager: EntityManager;
    relations?: string[];
}): Promise<APIKeyEntity | null> {
    const ALIAS = "users";
    const query = manager
        .getRepository(APIKeyEntity)
        .createQueryBuilder(ALIAS)
        .where({ id: id })
        .addRelations(ALIAS, relations);

    const val = await query.getOne();

    return val || null;
}

async function getAPIKeyOrFail({
    id,
    manager,
    relations = []
}: {
    id: string;
    manager: EntityManager;
    relations?: string[];
}): Promise<APIKeyEntity> {
    const apiKey = await getAPIKey({
        id,
        manager,
        relations
    });
    if (!apiKey) throw new Error(`Failed to get api id ${id}`);
    return apiKey;
}

@EntityRepository(UserEntity)
export class APIKeyRepository extends Repository<APIKeyEntity> {
    async createAPIKey({
        user,
        label,
        scopes,
        relations = []
    }: {
        user: UserEntity;
        label: string;
        scopes: Scope[];
        relations?: string[];
    }): Promise<APIKeyWithSecret> {
        return this.manager.nestedTransaction(async (transaction) => {
            const existingKey = await transaction
                .getRepository(APIKeyEntity)
                .createQueryBuilder()
                .where({ userId: user.id, label: label })
                .getOne();

            if (existingKey != null) {
                throw new ValidationError("NOT_UNIQUE");
            }

            // user does not exist, create it

            const secret = uuidv4();

            const apiKey = transaction.create(APIKeyEntity);
            apiKey.user = user;
            apiKey.label = label;
            apiKey.id = uuidv4();
            apiKey.hash = hashPassword(secret, apiKey.id);
            apiKey.scopes = scopes;

            try {
                const savedKey = await transaction.save(apiKey);
            } catch (error) {
                if (error.code === 23505) throw new ValidationError("NOT_UNIQUE");
                console.error(error);
                throw error;
            }
            // do allow secret to be returned when a new key is created

            return {
                id: apiKey.id,
                secret: secret,
                label: label,
                scopes: scopes
            };
        });

        // TODO - then send an email to the user that an API key has been created
    }

    async findByUser(userId: number): Promise<APIKeyEntity[]> {
        return await this.manager
            .getRepository(APIKeyEntity)
            .createQueryBuilder("findUsersAPIKeys")
            .where({ userId })
            .getMany();
    }

    deleteAPIKey({ id, relations = [] }: { id: string; relations?: string[] }): Promise<APIKeyEntity> {
        return this.manager.nestedTransaction(async (transaction) => {
            const apiKey = getAPIKeyOrFail({
                id,
                manager: this.manager,
                relations
            });

            await transaction.delete(APIKeyEntity, { id: (await apiKey).id });
            delete (await apiKey).hash; // never return the hash
            return apiKey;
        });
    }
}
