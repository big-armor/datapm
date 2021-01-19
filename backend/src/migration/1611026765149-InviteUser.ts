import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE "public"."user" ALTER COLUMN "username" VARCHAR(39) DEFAULT NULL;
    ALTER TABLE "public"."user" ALTER COLUMN "password_hash" VARCHAR(255) DEFAULT NULL;
    ALTER TABLE "public"."user" ALTER COLUMN "password_salt" VARCHAR(255) DEFAULT NULL;
`;
export class InviteUser1611026765149 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
