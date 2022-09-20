import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `

    ALTER TABLE "public"."user" ADD COLUMN "verify_email_token" VARCHAR(255) DEFAULT NULL;
    ALTER TABLE "public"."user" ADD COLUMN "verify_email_token_date" TIMESTAMP WITH TIME ZONE;
    ALTER TABLE "public"."user" ADD COLUMN "email_verified" BOOLEAN DEFAULT FALSE;
    UPDATE "public"."user" SET email_verified = true;
`;
export class EmailVerification1603893535901 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
