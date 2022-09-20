import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUIDarkModeColumnToUserTable1615996821186 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query(`
            ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "ui_dark_mode_enabled" BOOLEAN DEFAULT FALSE;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
