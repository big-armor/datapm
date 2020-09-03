import express from "express";
import { EntityManager } from "typeorm";

import { Jwt, parseJwt as ensureUserExistsOrCreate, parseJwt } from "./jwt";
import { User } from "../entity/User";
import { Catalog } from "../entity/Catalog";


export interface MeJwt {
  jwt: Jwt;
  id: number;
  firstName?: string;
  lastName?: string;
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
    if(err.name == 'NoAuthenticationError')
      return undefined;
    else 
      throw err;
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
): Promise<MeJwt | undefined> {
  try {
    const me = await manager.nestedTransaction(async (transaction) => {

      const sub = jwt.sub;
      const userRepo = manager.getRepository(User);
    
      const user = await userRepo.findOneOrFail({ where: { id: sub,isActive: true } });

      user.lastLogin = new Date();

      await transaction.save(user);

      return user;
      
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
