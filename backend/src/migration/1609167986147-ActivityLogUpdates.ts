import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE "public"."activity_log" ADD COLUMN updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL;
    ALTER TABLE "public"."activity_log" ADD CONSTRAINT activity_log_user_id_fkey FOREIGN KEY (user_id) REFERENCES "public"."user" (id) ON DELETE CASCADE;
    ALTER TABLE "public"."activity_log" ADD CONSTRAINT activity_log_target_package_id_fkey FOREIGN KEY (target_package_id) REFERENCES "public"."package" (id) ON DELETE CASCADE;
    ALTER TABLE "public"."activity_log" ADD CONSTRAINT activity_log_target_catalog_id_fkey FOREIGN KEY (target_catalog_id) REFERENCES "public"."catalog" (id) ON DELETE CASCADE;
    ALTER TABLE "public"."activity_log" ADD CONSTRAINT activity_log_target_collection_id_fkey FOREIGN KEY (target_collection_id) REFERENCES "public"."collection" (id) ON DELETE CASCADE;
`;

export class ActivityLogUpdates1609167986147 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
