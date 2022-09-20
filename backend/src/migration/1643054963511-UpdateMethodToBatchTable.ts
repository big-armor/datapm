import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `

CREATE TYPE public.update_method_enum AS ENUM (
    'BATCH_FULL_SET',
    'APPEND_ONLY_LOG'
);

    ALTER TABLE batch ADD COLUMN updatemethod update_method_enum NOT NULL DEFAULT 'BATCH_FULL_SET';
`;

export class UpdateMethodToBatchTable1643054963511 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
