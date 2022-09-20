import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `

    ALTER TABLE activity_log ADD COLUMN permissions text[];

`;

export class ActivityLogPermissions1660663641407 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
