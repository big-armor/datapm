import { Connection } from "typeorm";
import { Request } from "express";
import { UserEntity } from "./entity/UserEntity";
import { SessionCache } from "./session-cache";

enum Scope {
    // Need to determine what these should be
    READ_PRIVATE_PACKAGES_CATALOGS,
    UPDATE_PRIVATE_PACKAGES_CATALOGS,
    DELETE_PRIVATE_PACKAGES_CATALOGS
}

export interface Context {
    connection: Connection;
    request: Request;
    me?: UserEntity;
    scopes?: Scope[];
    cache: SessionCache;
}

export interface AuthenticatedContext extends Context {
    connection: Connection;
    request: Request;
    me: UserEntity;
    scopes: [];
}

export interface AutoCompleteContext extends Context {
    query: string;
}
