import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    -- Relation table creation
    CREATE TABLE public.collection_package (
        collection_id INTEGER NOT NULL REFERENCES collection (id) ON DELETE CASCADE,
        package_id INTEGER NOT NULL REFERENCES package (id) ON DELETE CASCADE,
        added_by INTEGER REFERENCES public.user (id),
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
        PRIMARY KEY (collection_id, package_id),
        UNIQUE (collection_id, package_id)
    );

    -- Index the collection_id column for faster queries
    -- We might want to add another index for the package_id if we want to see what collections a package is in
    CREATE INDEX "idx_collection_package_collection_id" on collection_package (collection_id);
`;

export class CreateCollectionAndPackageRelation1600840245777 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
