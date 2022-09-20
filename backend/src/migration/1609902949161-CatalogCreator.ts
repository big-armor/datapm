import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE catalog ADD COLUMN IF NOT EXISTS creator_id BIGINT;
`;
export class CatalogCreator1609902949161 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
