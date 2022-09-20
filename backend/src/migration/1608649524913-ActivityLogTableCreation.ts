import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
CREATE TYPE public."activity_log_event_type_enum" AS ENUM (
    'PACKAGE_PATCH_CHANGE',
    'PACKAGE_MINOR_CHANGE',
    'PACKAGE_MAJOR_CHANGE',
    'PACKAGE_CREATED',
    'PACKAGE_DELETED',
    'PACKAGE_VIEWED',
    'COLLECTION_PACKAGE_ADDED',
    'COLLECTION_PACKAGE_REMOVED'
);

ALTER TYPE public."activity_log_event_type_enum" OWNER TO postgres;

CREATE TABLE public."activity_log" (
    id integer NOT NULL,
    user_id integer,
    event_type public."activity_log_event_type_enum" NOT NULL,
    target_package_id integer,
    target_package_version_id integer,
    target_catalog_id integer,
    target_collection_id integer,
    created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL
);
`;

export class ActivityLogTableCreation1608649524913 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
