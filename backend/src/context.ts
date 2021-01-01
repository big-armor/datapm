import { Connection } from "typeorm";
import { Request } from "express";
import { User } from "./entity/User";

enum Scope {
    // Need to determine what these should be
    READ_PRIVATE_PACKAGES_CATALOGS,
    UPDATE_PRIVATE_PACKAGES_CATALOGS,
    DELETE_PRIVATE_PACKAGES_CATALOGS
}

export interface Context {
    connection: Connection;
    request: Request;
    me?: User;
    scopes?: Scope[];
}

export interface AuthenticatedContext extends Context {
    connection: Connection;
    request: Request;
    me: User;
    scopes: [];
}

export interface AutoCompleteContext extends Context {
    query: string;
}
