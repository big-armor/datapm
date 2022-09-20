import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCollectionViewedLogType1611872734083 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(
            `
                ALTER TABLE public."activity_log" ALTER COLUMN event_type TYPE VARCHAR(255);

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
                    'COLLECTION_VIEWED',
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

                ALTER TABLE public."activity_log" ALTER COLUMN event_type TYPE activity_log_event_type_enum USING (event_type::activity_log_event_type_enum);
            `
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
