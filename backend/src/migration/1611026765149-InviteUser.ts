import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE "public"."user" ALTER COLUMN "username" drop not NULL;
    ALTER TABLE "public"."user" ALTER COLUMN "password_hash" drop not NULL;
    ALTER TABLE "public"."user" ALTER COLUMN "password_salt" drop not NULL;
`;
export class InviteUser1611026765149 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
