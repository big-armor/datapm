import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `UPDATE package SET displayName_tokens = to_tsvector(package."displayName"), description_tokens = to_tsvector(description)`;
export class FullTextSearch21599791878226 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
