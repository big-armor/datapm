import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    ALTER TABLE "apiKey" ADD CONSTRAINT uniqueUserLabels UNIQUE(user_id,label)
`;
export class APIKeyChanges31599184609581 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
