import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'FETCH_JOB_STARTED';
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'FETCH_JOB_ENDED';
`;

export class FetchJobActivities1668544666051 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
