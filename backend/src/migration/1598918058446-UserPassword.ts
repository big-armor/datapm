import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    ALTER TABLE "public"."user" ADD COLUMN password_hash VARCHAR(255) DEFAULT 'zx7FmJPuyN5SL' NOT NULL ;
    ALTER TABLE "public"."user" ADD COLUMN password_salt VARCHAR(255) DEFAULT 'dfasdf2rffsadfa' NOT NULL ;  
`;

export class UserPassword1598918058446 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.manager.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
