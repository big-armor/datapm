import { MigrationInterface, QueryRunner } from "typeorm";

export class MakeActivityLogTableChangeTypeColumnAVarChar1620769501264 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const query = 'ALTER TABLE public."activity_log" ALTER COLUMN change_type TYPE VARCHAR(255)';
        return queryRunner.query(query);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
