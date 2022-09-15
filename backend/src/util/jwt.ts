import { AuthenticationError, ApolloError } from "apollo-server";
import jwt from "jsonwebtoken";
import express from "express";

import { UserEntity } from "../entity/UserEntity";
import { getEnvVariable } from "./getEnvVariable";

export class InvalidAuthenticationError extends ApolloError {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(message: string, extensions?: Record<string, any>) {
        super(message, "INVALID_AUTHENTICATION", extensions);

        Object.defineProperty(this, "name", { value: "InvalidAuthenticationError" });
    }
}

export class NoAuthenticationError extends ApolloError {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    constructor(message: string, extensions?: Record<string, any>) {
        super(message, "NO_AUTHENTICATION_TOKEN", extensions);

        Object.defineProperty(this, "name", { value: "NoAuthenticationError" });
    }
}

const jwtOptions = {
    audience: getEnvVariable("REGISTRY_URL"),
    issuer: getEnvVariable("REGISTRY_URL")
};

const verifyToken = (token: string, secretOrPublicKey: jwt.Secret, options?: jwt.VerifyOptions) => {
    return new Promise<DecodedJwt>((resolve, reject) => {
        jwt.verify(token, secretOrPublicKey, options, (err, result) => {
            if (err) reject(new InvalidAuthenticationError(err.message));
            else resolve(result as DecodedJwt);
        });
    });
};

function getToken(req: express.Request): string {
    if (req.cookies != null && req.cookies.token != null) {
        const token = req.cookies.token || "";
        return token;
    }

    const authHeader = req.headers.authorization || "";

    const match = authHeader.match(/^Bearer (.*)$/);
    if (!match || match.length < 2) {
        throw new NoAuthenticationError(`Authorization token not prepsent- ${authHeader} does not match "Bearer .*"`);
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

export async function getJwtFromRequest(req: express.Request): Promise<Jwt> {
    // extract and parse JWT
    const token = getToken(req);
    return parseJwt(token);
}

export async function parseJwt(token: string): Promise<Jwt> {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || !decoded.header || !decoded.header.kid) {
        throw new AuthenticationError("invalid token");
    }

    // verify JWT is valid (signature/aud/iss/exp)
    const verifiedJwt = await verifyToken(token, getEnvVariable("JWT_KEY"), jwtOptions);

    return {
        token: token,
        sub: verifiedJwt.sub,
        decoded: verifiedJwt
    };
}

export function createJwt(user: UserEntity): string {
    return jwt.sign({}, getEnvVariable("JWT_KEY"), {
        algorithm: "HS256",
        subject: user.id.toString(),
        expiresIn: "1d",
        keyid: "JWT_KEY",
        audience: getEnvVariable("REGISTRY_URL"),
        issuer: getEnvVariable("REGISTRY_URL")
    });
}
