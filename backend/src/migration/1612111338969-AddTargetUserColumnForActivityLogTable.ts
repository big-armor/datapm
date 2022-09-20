import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTargetUserColumnForActivityLogTable1612111338969 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query("ALTER TABLE public.activity_log ADD COLUMN target_user_id INTEGER");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
