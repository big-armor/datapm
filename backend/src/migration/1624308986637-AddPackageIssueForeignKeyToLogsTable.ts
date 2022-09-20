import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPackageIssueForeignKeyToLogsTable1624308986637 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.connection.query("DELETE FROM activity_log WHERE event_type = 'PACKAGE_ISSUE_STAUS_CHANGE'");
        await queryRunner.connection.query(
            "ALTER TYPE activity_log_event_type_enum ADD VALUE 'PACKAGE_ISSUE_STATUS_CHANGE'"
        );
        await queryRunner.connection.query("ALTER TYPE activity_log_change_type_enum ADD VALUE 'OPENED'");
        await queryRunner.connection.query("ALTER TYPE activity_log_change_type_enum ADD VALUE 'CLOSED'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
