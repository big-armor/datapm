import express from "express";
import { EntityManager } from "typeorm";

import { Jwt, parseJwt, ensureAuth0UserExistsOrCreate } from "./jwt";
import { User } from "../entity/User";
import { Permissions } from "../entity/Permissions";
import { UserCatalogPermission } from "../entity/UserCatalogPermission";
import { Catalog } from "../entity/Catalog";
import { getEnvVariable } from "./getEnvVariable";

interface UserCatalogResponse {
  id: number;
  permissions: Permissions[];
}

export interface MeJwt {
  jwt: Jwt;
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  email: string;
  isSiteAdmin: boolean;
  username: string;

}

export interface MeCatalog extends MeJwt {
  catalog: Catalog;
}

// get Me object based on express request
// parses JWT from Authorization header
// used for packageion
export async function getMeRequest(
  req: express.Request,
  manager: EntityManager
) {
  try {
    return getMeJwt(await parseJwt(req), manager);
  } catch (err) {
    //console.error(`Error getting user from JWT. ${err}`);
    return undefined;
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
async function getMeJwt(
  jwt: Jwt,
  manager: EntityManager
): Promise<MeJwt | undefined> {
  try {
    const me = await manager.nestedTransaction(async (transaction) => {
      const user = await ensureAuth0UserExistsOrCreate(jwt, transaction);

      // update user last_login to NOW

      
      user.lastLogin = new Date();

      await transaction.save(user);

      /*
        // use raw sql to avoid calling subscribers
        await transaction.query(
        'UPDATE "user" SET last_login = NOW() WHERE is_active=true AND id = $1',
        [user.id]
      ); */

      return transaction.getRepository(User).findOneOrFail({
        where: { sub: jwt.sub, isActive: true },
        relations: [],
      });
    });

    // build result
    return {
      jwt: jwt,
      id: me.id,
      firstName: me.firstName,
      lastName: me.lastName,
      fullName: me.name,
      email: me.emailAddress,
      isSiteAdmin: me.isSiteAdmin,
      username: me.username
    };
  } catch (e) {
    console.error(`Error getting user from JWT. ${e}`);
    return undefined;
  }
}
