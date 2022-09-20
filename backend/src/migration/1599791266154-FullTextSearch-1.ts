import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    
    ALTER TABLE package ADD COLUMN displayName_tokens TSVECTOR;
    ALTER TABLE package ADD COLUMN description_tokens TSVECTOR;

`;
export class FullTextSearch11599791266154 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
