import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    alter table "public"."version" add column update_methods jsonb;
`;
export class UpdateMethod1649190799043 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
