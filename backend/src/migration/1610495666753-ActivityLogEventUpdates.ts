import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    DELETE FROM public."activity_log";
    
    ALTER TABLE public."activity_log" DROP COLUMN "event_type";

    DROP TYPE public."activity_log_event_type_enum";
    CREATE TYPE public."activity_log_event_type_enum" AS ENUM (
        'PACKAGE_CREATED',
        'PACKAGE_DELETED',
        'PACKAGE_VIEWED',
        'PACKAGE_FETCHED',
        'PACKAGE_PUBLIC_CHANGED',
        'PACKAGE_EDIT',
        'VERSION_CREATED',
        'VERSION_DELETED',
        'COLLECTION_CREATED',
        'COLLECTION_DELETED',
        'COLLECTION_EDIT',
        'COLLECTION_PACKAGE_ADDED',
        'COLLECTION_PACKAGE_REMOVED',
        'COLLECTION_PUBLIC_CHANGED',
        'CATALOG_CREATED',
        'CATALOG_DELETED',
        'CATALOG_PUBLIC_CHANGED',
        'CATALOG_EDIT',
        'USER_CREATED',
        'USER_DELETED',
        'USER_EDIT'
    );
    
    ALTER TABLE public."activity_log" ADD COLUMN event_type public."activity_log_event_type_enum" NOT NULL;


    CREATE TYPE public."activity_log_change_type_enum" AS ENUM (
        'VERSION_FIRST_VERSION',
        'VERSION_PATCH_CHANGE',
        'VERSION_MINOR_CHANGE',
        'VERSION_MAJOR_CHANGE',
        'PUBLIC_ENABLED',
        'PUBLIC_DISABLED',
        'COVER_IMAGE_UPDATED',
        'COVER_IMAGE_REMOVED'
        'AVATAR_IMAGE_UPDATED'
        'AVATAR_IMAGE_REMOVED'
    );

    ALTER TABLE public."activity_log" ADD COLUMN change_type public."activity_log_change_type_enum";

    ALTER TABLE public."package" ADD COLUMN fetch_count int8  NOT NULL DEFAULT 0;

    ALTER TABLE public."package" ADD COLUMN view_count int8  NOT NULL DEFAULT 0;

    ALTER TABLE public."activity_log" ADD COLUMN properties_edited text[]; 


`;
export class ActivityLogEventUpdates1610495666753 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
