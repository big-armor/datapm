import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE "group" ADD COLUMN "is_admin" boolean NOT NULL DEFAULT false;
`;

export class GroupAdmin1662572838241 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
