import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    CREATE INDEX activity_log_user_id_event_type_idx ON "public"."activity_log" (user_id, event_type);
`;

export class ActivityLogAddIndex1609348606379 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
