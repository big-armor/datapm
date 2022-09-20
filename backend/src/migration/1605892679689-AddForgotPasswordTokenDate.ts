import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE "public"."user" ADD COLUMN "password_recovery_token_date" TIMESTAMP WITH TIME ZONE;
`;

export class AddForgotPasswordTokenDate1605892679689 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
