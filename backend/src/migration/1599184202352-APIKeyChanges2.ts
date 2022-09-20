import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
ALTER TABLE "apiKey" ALTER COLUMN id TYPE text;
`;
export class APIKeyChanges21599184202352 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
