import { promisify } from "util";
import { AuthenticationError } from "apollo-server";
import { EntityManager } from "typeorm";
import jwks from "jwks-rsa";
import jwt from "jsonwebtoken";
import express from "express";
import fetch from "node-fetch";

import { User } from "../entity/User";
import { getEnvVariable } from "./getEnvVariable";

const client = jwks({
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10, // Default value
  jwksUri: `${process.env.AUTH0_ISSUER}.well-known/jwks.json`,
});

const jwtOptions = {
  audience: process.env.AUTH0_AUDIENCE,
  issuer: process.env.AUTH0_ISSUER,
};

const getSigningKey = promisify(client.getSigningKey);

const verifyToken = (
  token: string,
  secretOrPublicKey: jwt.Secret,
  options?: jwt.VerifyOptions
) => {
  return new Promise<DecodedJwt>((resolve, reject) => {
    jwt.verify(token, secretOrPublicKey, options, (err, result) => {
      if (err) reject(new AuthenticationError(err.message));
      resolve(result as DecodedJwt);
    });
  });
};

function getToken(req: express.Request): string {
  const authHeader = req.headers.authorization || "";

  const match = authHeader.match(/^Bearer (.*)$/);
  if (!match || match.length < 2) {
    throw new AuthenticationError(
      `Invalid Authorization token - ${authHeader} does not match "Bearer .*"`
    );
  }
  return match[1];
}

export interface DecodedJwt {
  iss: string;
  sub: string;
  aud: string[];
  iat: number;
  exp: number;
  azp: string;
  scope: string;
}

export interface Jwt {
  token: string;
  sub: string;
  decoded: DecodedJwt;
}

export async function parseJwt(req: express.Request): Promise<Jwt> {
  // extract and parse JWT
  const token = getToken(req);
  const decoded: any = jwt.decode(token, { complete: true });
  if (!decoded || !decoded.header || !decoded.header.kid) {
    throw new AuthenticationError("invalid token");
  }

  // get token public key
  const key = await getSigningKey(decoded.header.kid);
  const signingKey =
    (key as jwks.CertSigningKey).publicKey ||
    (key as jwks.RsaSigningKey).rsaPublicKey;
  if (!signingKey) {
    throw new AuthenticationError("failed to get signing key");
  }

  // verify JWT is valid (signature/aud/iss/exp)
  const verifiedJwt = await verifyToken(token, signingKey, jwtOptions);

  return {
    token: token,
    sub: verifiedJwt.sub,
    decoded: verifiedJwt,
  };
}

interface UserInfo {
  sub: string;
  given_name?: string;
  family_name?: string;
  nickname?: string;
  name: string;
  picture: string;
  updated_at: string;
  emailAddress: string;
  email_verified: boolean;
}

async function getUserInfo(token: string): Promise<UserInfo> {
  const USERINFO_URL = `${getEnvVariable("AUTH0_ISSUER")}userinfo`;
  const result = await fetch(USERINFO_URL, {
    method: "GET",
    headers: { Authorization: `Bearer ${token}` },
  });

  if (result.status !== 200) {
    throw new Error(
      `Failed to get userinfo - bad status code ${result.status}`
    );
  }

  return await result.json();
}

export async function ensureAuth0UserExistsOrCreate(
  jwt: Jwt,
  manager: EntityManager
): Promise<User> {
  const sub = jwt.sub;
  const userRepo = manager.getRepository(User);

  const user = await userRepo.find({ where: { sub } });
  if (user.length > 0) return user[0]; // user exists - good to go

  // retrieve user info from jwt - used to update existing or create new user
  const userInfo = await getUserInfo(jwt.token);
  if (!userInfo.email_verified) {
    throw new Error("Email is not verified");
  }

  // get all users whose email matches
  const existingUsers = await userRepo
    .createQueryBuilder()
    .where("LOWER(email) = :email", {
      email: userInfo.emailAddress.toLocaleLowerCase(),
    })
    .getMany();

  if (existingUsers.length > 1) {
    // database is in a bad state - this should never happen
    throw new Error(
      `Multiple users with email ${userInfo.emailAddress} already exists`
    );
  } else if (existingUsers.length === 1) {
    // attempt to migrate existing user to include auth0 sub
    const existingUser = existingUsers[0];
    if (existingUser.sub) {
      throw new Error(`User with email ${userInfo.emailAddress} already taken`);
    }

    existingUser.sub = sub;
    return await userRepo.save(existingUser);
  } else {
    // create new user
    const newUser = userRepo.create();
    newUser.sub = userInfo.sub;
    newUser.firstName = userInfo.given_name || "";
    newUser.lastName = userInfo.family_name || "";
    newUser.emailAddress = userInfo.emailAddress;
    return await userRepo.save(newUser);
  }
}
