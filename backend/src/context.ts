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
    scopes?: Scope[];
    cache: SessionCache;
}

export interface HTTPContext extends Context {
    request: Request;
}

export type SocketContext = Context;

export interface AuthenticatedContext extends Context {
    me: UserEntity;
    isAdmin: boolean;
}

export interface AuthenticatedHTTPContext extends AuthenticatedContext, HTTPContext {
    // HTTP authentication specific context info
}

export interface AuthenticatedSocketContext extends AuthenticatedContext, SocketContext {
    // Socket authentication specific context info
}

export interface AutoCompleteContext extends Context {
    me?: UserEntity;
    query: string;
}
