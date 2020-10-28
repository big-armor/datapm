import querystring from "querystring";

import { EntityRepository, Repository, EntityManager } from "typeorm";
import { v4 as uuidv4 } from "uuid";

import { User } from "../entity/User";

import { APIKey } from "../entity/APIKey";
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
}): Promise<APIKey | null> {
    const ALIAS = "users";
    let query = manager
        .getRepository(APIKey)
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
}): Promise<APIKey> {
    const apiKey = await getAPIKey({
        id,
        manager,
        relations
    });
    if (!apiKey) throw new Error(`Failed to get api id ${id}`);
    return apiKey;
}

@EntityRepository(User)
export class APIKeyRepository extends Repository<APIKey> {
    constructor() {
        super();
    }

    async findAllForUser({ user, relations = [] }: { user: User; relations?: string[] }) {
        const ALIAS = "users";
        const keys = await this.manager
            .getRepository(APIKey)
            .createQueryBuilder(ALIAS)
            .where({ user: User })
            .addRelations(ALIAS, relations)
            .getMany();

        // Never return the hash
        keys.forEach((k) => delete k.hash);
    }

    async createAPIKey({
        user,
        label,
        scopes,
        relations = []
    }: {
        user: User;
        label: string;
        scopes: Scope[];
        relations?: string[];
    }): Promise<APIKeyWithSecret> {
        return this.manager.nestedTransaction(async (transaction) => {
            const existingKey = await transaction
                .getRepository(APIKey)
                .createQueryBuilder()
                .where({ userId: user.id, label: label })
                .getOne();

            if (existingKey != undefined) {
                throw new ValidationError("NOT_UNIQUE");
            }

            // user does not exist, create it

            const secret = uuidv4();

            const apiKey = transaction.create(APIKey);
            apiKey.user = user;
            apiKey.label = label;
            apiKey.id = uuidv4();
            apiKey.hash = hashPassword(secret, apiKey.id);
            apiKey.scopes = scopes;

            try {
                const savedKey = await transaction.save(apiKey);
            } catch (error) {
                if (error.code == 23505) throw new ValidationError("NOT_UNIQUE");
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

    async findByUser(userId: number): Promise<APIKey[]> {
        return await this.manager
            .getRepository(APIKey)
            .createQueryBuilder("findUsersAPIKeys")
            .where({ userId })
            .getMany();
    }

    deleteAPIKey({ id, relations = [] }: { id: string; relations?: string[] }): Promise<APIKey> {
        return this.manager.nestedTransaction(async (transaction) => {
            const apiKey = getAPIKeyOrFail({
                id,
                manager: this.manager,
                relations
            });

            await transaction.delete(APIKey, { id: (await apiKey).id });
            delete (await apiKey).hash; // never return the hash
            return apiKey;
        });
    }
}
