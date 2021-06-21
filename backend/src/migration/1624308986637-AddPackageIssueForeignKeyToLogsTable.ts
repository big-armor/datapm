import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPackageIssueForeignKeyToLogsTable1624308986637 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        const query = `
        DELETE FROM activity_log
        WHERE target_package_issue_id IS NOT NULL
        AND NOT EXISTS(
                SELECT id
                FROM package_issue
                WHERE id = target_package_issue_id
            );

        ALTER TABLE activity_log
        ADD CONSTRAINT activity_log_target_package_issue_id_fkey
        FOREIGN KEY (target_package_issue_id)
        REFERENCES package_issue(id)
        ON DELETE CASCADE;`;
        return queryRunner.query(query);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
