import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'PACKAGE_UPDATE_JOB_STARTED';
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'PACKAGE_UPDATE_JOB_ENDED';
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'PACKAGE_JOB_STARTED';
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'PACKAGE_JOB_ENDED';
`;

export class JobActivities1647123024092 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
