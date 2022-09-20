import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    ALTER TABLE "public"."activity_log" ADD COLUMN target_data_batch_id BIGINT DEFAULT NULL;
    ALTER TABLE "public"."activity_log" ADD CONSTRAINT activity_log_target_data_batch_id_fkey FOREIGN KEY (target_data_batch_id) REFERENCES "public"."batch" (id) ON DELETE CASCADE;

    ALTER TYPE activity_log_event_type_enum ADD VALUE 'DATA_BATCH_UPLOAD_STARTED';
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'DATA_BATCH_UPLOAD_STOPPED';
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'DATA_BATCH_DOWNLOAD_STARTED';
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'DATA_BATCH_DOWNLOAD_STOPPED';
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'DATA_BATCH_ACTIVE_CHANGED';
    ALTER TYPE activity_log_event_type_enum ADD VALUE 'DATA_SINK_STATE_REQUESTED';

    alter table "public"."activity_log" add column additional_properties jsonb;
`;

export class ActivityLogDataBatch1643208391980 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
