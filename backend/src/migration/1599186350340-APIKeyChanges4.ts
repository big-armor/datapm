import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    CREATE TYPE scope AS ENUM (
        'MANAGE_API_KEYS',
        'READ_PRIVATE_ASSETS',
        'MANAGE_PRIVATE_ASSETS'
    );

    ALTER TABLE "apiKey" DROP COLUMN scopes;
    ALTER TABLE "apiKey" ADD COLUMN scopes scope[];
`;
export class APIKeyChanges41599186350340 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
