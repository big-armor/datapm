import { createDatabase } from 'pg-god'
import { createConnection, Connection, getConnection, getConnectionOptions } from 'typeorm'
import { PostgresConnectionOptions } from 'typeorm/driver/postgres/PostgresConnectionOptions'

let conn: Connection | undefined

export async function superCreateConnection(): Promise<Connection> {

  if (conn) return conn

  // may either read from ormconfig or hardcode your options here
  const ormOpts: PostgresConnectionOptions = await getConnectionOptions() as PostgresConnectionOptions;

  try {

    conn = await createConnection(ormOpts)
    console.log("DataBaseCreation.superCreateConnection2");

    console.log("Found: " + ormOpts.database!);
    return conn
  } catch (error) {
    console.log("Database creation error : " + JSON.stringify(error));

    if (error.code == '3F000') {

      console.log("Starting database creation)");
      // Database doesn't exist.
      // PG error code ref: https://docstore.mik.ua/manuals/sql/postgresql-8.2.6/errcodes-appendix.html
      await createDatabase(
        { databaseName: ormOpts.schema!, errorIfExist: false },
        {
          user: ormOpts.username,
          port: ormOpts.port,
          host: ormOpts.host,
          password:
            (typeof ormOpts.password === 'undefined') ? undefined :
            (typeof ormOpts.password === 'string') ? ormOpts.password :
            await ormOpts.password()
          ,
        }
      )
      return superCreateConnection()
    }
    throw error
  }
}