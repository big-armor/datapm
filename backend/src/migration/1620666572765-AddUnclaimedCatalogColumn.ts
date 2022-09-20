import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUnclaimedCatalogColumn1620666572765 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const sql = "ALTER TABLE catalog ADD COLUMN IF NOT EXISTS unclaimed BOOLEAN DEFAULT FALSE";
        return queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
