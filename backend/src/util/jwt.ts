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

  // verify JWT is valid (signature/aud/iss/exp)
  const verifiedJwt = await verifyToken(token, getEnvVariable("JWT_KEY"), jwtOptions);

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

