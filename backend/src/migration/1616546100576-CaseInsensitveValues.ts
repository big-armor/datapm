import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    DROP INDEX IF EXISTS UQ_ef074a5270e6b67c7882c116fae;
    CREATE UNIQUE INDEX email_unique_idx on public."user" (LOWER("emailAddress"));
    CREATE UNIQUE INDEX username_unique_idx on public."user" (LOWER(username));

    DROP INDEX IF EXISTS UQ_70e71bbbc89ee871113c2afd910;

    DROP INDEX IF EXISTS idx_collection_slug;
    ALTER TABLE collection DROP CONSTRAINT collection_slug_key;
    DROP INDEX IF EXISTS collection_slug_key;
    
    CREATE UNIQUE INDEX collection_slug on collection (LOWER(slug))
`;

export class CaseInsensitveValues1616546100576 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(_queryRunner: QueryRunner): Promise<void> {
        //
    }
}
