import querystring from "querystring";

import {
  EntityRepository,
  Repository,
  EntityManager,
  SelectQueryBuilder,
} from "typeorm";
import sgMail from "@sendgrid/mail";
import { v4 as uuidv4 } from 'uuid';

import { User } from "../entity/User";

import { APIKey } from "../entity/APIKey";

// https://stackoverflow.com/a/52097700
export function isDefined<T>(value: T | undefined | null): value is T {
  return <T>value !== undefined && <T>value !== null;
}

async function getAPIKey({
  key,
  manager,
  relations = [],
}: {
  key: string;
  catalogId?: number;
  manager: EntityManager;
  relations?: string[];
}): Promise<APIKey | null> {
  const ALIAS = "users";
  let query = manager
    .getRepository(APIKey)
    .createQueryBuilder(ALIAS)
    .where({ key: key })
    .addRelations(ALIAS, relations);

  const val = await query.getOne();

  return val || null;
}




async function getAPIKeyOrFail({
  key,
  manager,
  relations = [],
}: {
  key: string;
  manager: EntityManager;
  relations?: string[];
}): Promise<APIKey> {
  const apiKey = await getAPIKey({
    key,
    manager,
    relations,
  });
  if (!apiKey) throw new Error(`Failed to get api key ${key}`);
  return apiKey;
}

@EntityRepository(User)
export class APIKeyRepository extends Repository<APIKey> {
  constructor() {
    super();
    sgMail.setApiKey(process.env.SENDGRID_API_KEY || "SG.DUMMY");
  }

  async findAllForUser({
    user,
    relations = [],
  }: {
    user: User,
    relations?: string[];
  }) {
    const ALIAS = "users";
    const keys = await this.manager
      .getRepository(APIKey)
      .createQueryBuilder(ALIAS)
      .where({ user: User })
      .addRelations(ALIAS, relations)
      .getMany();

    // Never return the secret
    keys.forEach(k => delete k.secret)
  }


  async createAPIKey({
    user,
    relations = [],
  }: {
    user: User;
    relations?: string[];
  }): Promise<APIKey> {
    return this.manager.nestedTransaction(async (transaction) => {

    
      // user does not exist, create it

      const apiKey = transaction.create(APIKey);
      apiKey.user = user;
      apiKey.key = uuidv4();
      apiKey.secret = uuidv4();


      const now = new Date();
      apiKey.createdAt = now;
      apiKey.updatedAt = now;


     
      const savedKey = await transaction.save(apiKey);

      // do allow secret to be returned when a new key is created
      
      return savedKey;
      
    });


    
  }



  deleteAPIKey({
    key,
    relations = []
  }: {
    key: string,
    relations?: string[]
  }): Promise<APIKey> {

    const apiKey = getAPIKeyOrFail({
      key: key,
      manager: this.manager,
      relations
    });

    return this.manager.nestedTransaction(async (transaction) => {
      await transaction.delete(APIKey, { key: (await apiKey).key });
      delete (await apiKey).secret;
      return apiKey;
    });

  }

}
