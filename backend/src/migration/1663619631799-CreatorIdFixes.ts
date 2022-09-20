import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE public.collection ALTER COLUMN creator_id TYPE int4;
    ALTER TABLE public.catalog ALTER COLUMN creator_id TYPE int4;
    ALTER TABLE public.package ALTER COLUMN creator_id TYPE int4;
`;

export class CreatorIdFixes1663619631799 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
