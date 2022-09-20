import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE "package" ADD COLUMN "last_update_job_date" timestamptz DEFAULT CURRENT_TIMESTAMP NOT NULL;
`;
export class PackageLastUpdateJob1648151610519 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
