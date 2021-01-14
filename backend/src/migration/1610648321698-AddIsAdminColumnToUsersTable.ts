import { MigrationInterface, QueryRunner } from "typeorm";

export class AddIsAdminColumnToUsersTable1610648321698 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const query = 'ALTER TABLE "user" ADD COLUMN IF NOT EXISTS "is_admin" BOOLEAN DEFAULT FALSE';
        return queryRunner.query(query);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
