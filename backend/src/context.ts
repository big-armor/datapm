import { Connection } from "typeorm";
import { MeJwt } from "./util/me";
import { Request } from "express";
import { DataLoaders } from "./dataLoaders";

export interface Context {
  connection: Connection;
  request: Request;
  dataLoaders: DataLoaders;
  me?: MeJwt;
}

export interface AuthenticatedContext extends Context {
  connection: Connection;
  request: Request;
  dataLoaders: DataLoaders;
  me: MeJwt;
}

