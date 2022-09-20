import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    ALTER TABLE "public"."user" ALTER COLUMN first_name DROP NOT NULL;
    ALTER TABLE "public"."user" ALTER COLUMN last_name DROP NOT NULL;
    ALTER TABLE "public"."user" ALTER COLUMN username TYPE varchar(39);
`;
export class DontRequireNameOnSignUp1599080105470 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
