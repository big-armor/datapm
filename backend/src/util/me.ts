import express from "express";
import { EntityManager } from "typeorm";

import { Jwt, parseJwt as ensureUserExistsOrCreate, parseJwt } from "./jwt";
import { User } from "../entity/User";
import { Catalog } from "../entity/Catalog";
import { UserRepository } from "../repository/UserRepository";
import { APIKeyRepository } from "../repository/APIKeyRepository";
import { APIKey } from "../entity/APIKey";
import { hashPassword } from "./PasswordUtil";
import atob from 'atob';
import { ApolloError } from "apollo-server";


// get Me object based on express request
// parses JWT from Authorization header
// used for packageion
export async function getMeRequest(
  req: express.Request,
  manager: EntityManager
):Promise<User | undefined> {

  let user;

  if(req.header("X-API-Key") != null) {

      return await manager.nestedTransaction(async (transaction) => {

        const decodedKey = atob(req.header("X-API-Key")!);

        const keyParts = decodedKey.split(".");
        const keyId = keyParts[0];
        const secret = keyParts[1];

        const hash = hashPassword(secret,keyId);

        const apiKeyRecord = (await transaction
          .getRepository(APIKey)
          .findOne({where: {id: keyId, hash: hash },
             relations: ["user"] 
            }));

        if(apiKeyRecord == null) {
          throw new ApolloError("API Key not found", "API_KEY_NOT_FOUND");
        }

        const user = apiKeyRecord.user

        return user;
      });

  } else if(req.header("Authorization") != null) {

    return new Promise<User | undefined>(async (success,error) => {
      try {
        success(getMeJwt(await parseJwt(req), manager));
      } catch (err) {
        if(err.name == 'NoAuthenticationError')
          return success(undefined);
        else 
          error(err);
      }
    });

  } else {
    return Promise.resolve(undefined);
  }

}

// get Me object based on user sub
// used for testing and development
// Note: Jwt object is not complete
export async function getMeSub(sub: string, manager: EntityManager) {
  const jwt: any = { sub };
  return getMeJwt(jwt, manager);
}

// takes a Jwt and retrieves the corresponding user from the database
// also retrieves permissions for that user
export async function getMeJwt(
  jwt: Jwt,
  manager: EntityManager
): Promise<User | undefined> {
  try {

    return await manager.nestedTransaction(async (transaction) => {

      const userId = jwt.sub;
      const userRepo = manager.getRepository(User);
    
      const user = await userRepo.findOneOrFail({ where: { id: userId,isActive: true } });

      user.lastLogin = new Date();

      await transaction.save(user);

      return user;
      
    });


  } catch (e) {
    console.error(`Error getting user from JWT. ${e}`);
    return undefined;
  }
}
