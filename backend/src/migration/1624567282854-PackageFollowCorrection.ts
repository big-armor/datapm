import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
UPDATE follow SET event_types = '{VERSION_CREATED,PACKAGE_EDIT}' WHERE target_package_id IS NOT NULL AND target_package_issue_id IS NULL
`;
export class PackageFollowCorrection1624567282854 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
