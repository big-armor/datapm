import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `

    DELETE FROM "apiKey";
    ALTER TABLE "apiKey" DROP COLUMN key;
    ALTER TABLE "apiKey" RENAME COLUMN secret TO hash;
    ALTER TABLE "apiKey" ADD COLUMN label VARCHAR(100) NOT NULL;
    ALTER TABLE "apiKey" ADD COLUMN scopes text NOT NULL;

`;
export class APIKeyChanges1599181511315 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
