const IS_DIST = process.env.TYPEORM_IS_DIST == null || process.env.TYPEORM_IS_DIST.toLowerCase() !== "false";
const PATH_PREFIX = IS_DIST ? "" : "src/";
const FILE_EXTENSION = IS_DIST ? "js" : "ts";

module.exports = {
    type: "postgres",
    host: process.env.TYPEORM_HOST || "localhost",
    port: process.env.TYPEORM_PORT || "5432",
    schema: process.env.TYPEORM_SCHEMA || "public",
    database: process.env.TYPEORM_DATABASE || "postgres",
    username: process.env.TYPEORM_USERNAME || "postgres",
    createSchema: process.env.TYPEORM_CREATE_SCHEMA || false,
    password: process.env.TYPEORM_PASSWORD,
    synchronize: process.env.TYPEORM_SYNCHRONIZE || false,
    logging: ["error"], // ["schema", "query", "error"],
    entities: [`${process.env.RUN_MIGRATION || ""}${PATH_PREFIX}entity/**/*.${FILE_EXTENSION}`],
    migrations: [`${PATH_PREFIX}migration/**/*.${FILE_EXTENSION}`],
    subscribers: [`${PATH_PREFIX}subscriber/**/*.${FILE_EXTENSION}`],
    migrationsRun: true,
    migrationsTableName: "typeorm_migrations",
    migrationsTransactionMode: "all",
    cli: {
        entitiesDir: `${PATH_PREFIX}entity`,
        migrationsDir: `${PATH_PREFIX}migration`,
        subscribersDir: `${PATH_PREFIX}subscriber`
    }
};
