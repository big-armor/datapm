import { MigrationInterface, QueryRunner } from "typeorm";

export class AddTargetIssueIdColumnToActivityLogTable1618418751085 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const query = `
            ALTER TABLE public.activity_log ADD COLUMN IF NOT EXISTS target_package_issue_id INTEGER;
            ALTER TABLE public.activity_log ALTER COLUMN event_type SET DATA TYPE varchar USING event_type::text;
        `;
        return queryRunner.query(query);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
