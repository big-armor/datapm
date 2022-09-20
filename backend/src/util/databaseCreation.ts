import { createDatabase } from "pg-god";
import { createConnection, Connection, getConnectionOptions } from "typeorm";
import { PostgresConnectionOptions } from "typeorm/driver/postgres/PostgresConnectionOptions";

let connection: Connection | undefined;

export async function superCreateConnection(): Promise<Connection> {
    if (connection) {
        return connection;
    }

    // may either read from ormconfig or hardcode your options here
    const ormOpts: PostgresConnectionOptions = (await getConnectionOptions()) as PostgresConnectionOptions;

    try {
        connection = await createConnection(ormOpts);
        return connection;
    } catch (error) {
        console.log("Database creation error : " + JSON.stringify(error));

        if (error.code === "3F000") {
            if (ormOpts.schema == null) {
                throw new Error("No schema provided");
            }
            console.log("Starting database creation)");
            // Database doesn't exist.
            // PG error code ref: https://docstore.mik.ua/manuals/sql/postgresql-8.2.6/errcodes-appendix.html
            await createDatabase(
                { databaseName: ormOpts.schema, errorIfExist: false },
                {
                    user: ormOpts.username,
                    port: ormOpts.port,
                    host: ormOpts.host,
                    password:
                        typeof ormOpts.password === "undefined"
                            ? undefined
                            : typeof ormOpts.password === "string"
                            ? ormOpts.password
                            : await ormOpts.password()
                }
            );
            return superCreateConnection();
        }
        throw error;
    }
}
