import { MigrationInterface, QueryRunner } from "typeorm";

export class AddExtraNotificationFieldsToFollowEntity1624904654313 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query(`
            ALTER TABLE "follow" ADD COLUMN "follow_all_packages" BOOLEAN DEFAULT FALSE;
            ALTER TABLE "follow" ADD COLUMN "follow_all_package_issues" BOOLEAN DEFAULT FALSE;
            ALTER TABLE "follow" ADD COLUMN "change_type" public.activity_log_change_type_enum[];

            UPDATE "follow"
            SET change_type = '{VERSION_PATCH_CHANGE}'
            WHERE target_package_id IS NOT NULL
            OR target_catalog_id IS NOT NULL
            OR target_collection_id IS NOT NULL;
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
