import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE "public"."user" ADD COLUMN "password_recovery_token" VARCHAR(255) DEFAULT NULL;
`;

export class addForgotPasswordToken1605722637632 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
