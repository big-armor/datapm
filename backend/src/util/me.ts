import express from "express";
import { EntityManager } from "typeorm";

import { Jwt, getJwtFromRequest } from "./jwt";
import { UserEntity } from "../entity/UserEntity";
import { APIKeyEntity } from "../entity/APIKeyEntity";
import { hashPassword } from "./PasswordUtil";
import atob from "atob";
import { AuthenticationError } from "apollo-server";

export async function getMeFromAPIKey(apiKey: string, entityManager: EntityManager): Promise<UserEntity> {
    return await entityManager.nestedTransaction(async (transaction) => {
        const decodedKey = atob(apiKey);

        const keyParts = decodedKey.split(".");
        const keyId = keyParts[0];
        const secret = keyParts[1];

        const hash = hashPassword(secret, keyId);

        const apiKeyRecord = await transaction
            .getRepository(APIKeyEntity)
            .findOne({ where: { id: keyId, hash: hash }, relations: ["user"] });

        if (apiKeyRecord == null) {
            throw new AuthenticationError("API_KEY_NOT_FOUND");
        }

        apiKeyRecord.lastUsed = new Date();
        await transaction.save(apiKeyRecord);

        const user = apiKeyRecord.user;

        return user;
    });
}

// get Me object based on express request
// parses JWT from Authorization header
// used for packageion
export async function getMeRequest(req: express.Request, manager: EntityManager): Promise<UserEntity | undefined> {
    let user;

    if (req.header("X-API-Key") != null) {
        return getMeFromAPIKey(req.header("X-API-Key") as string, manager);
    } else if (req.header("Authorization") != null) {
        try {
            return getMeJwt(await getJwtFromRequest(req), manager);
        } catch (err) {
            if (err.name === "NoAuthenticationError") return undefined;
            throw err;
        }
    } else {
        return Promise.resolve(undefined);
    }
}

// get Me object based on user sub
// used for testing and development
// Note: Jwt object is not complete
export async function getMeSub(sub: string, manager: EntityManager): Promise<UserEntity | undefined> {
    const jwt: Jwt = { sub, decoded: { iss: "", sub: "", aud: [], iat: 0, exp: 0, azp: "", scope: "" }, token: "" };
    return getMeJwt(jwt, manager);
}

// takes a Jwt and retrieves the corresponding user from the database
// also retrieves permissions for that user
export async function getMeJwt(jwt: Jwt, manager: EntityManager): Promise<UserEntity | undefined> {
    try {
        return await manager.nestedTransaction(async (transaction) => {
            const userId = jwt.sub;
            const userRepo = manager.getRepository(UserEntity);

            const user = await userRepo.findOneOrFail({ where: { id: userId } });

            user.lastLogin = new Date();

            await transaction.save(user);

            return user;
        });
    } catch (e) {
        console.error(`Error getting user from JWT. ${e}`);
        return undefined;
    }
}
