import { MigrationInterface, QueryRunner } from "typeorm";
const sql = `
ALTER TYPE activity_log_change_type_enum ADD VALUE 'VERSION_TRIVIAL_CHANGE';
ALTER TYPE activity_log_event_type_enum ADD VALUE 'VERSION_UPDATED';
`;
export class AddVersionTrivialChangeType1618415843311 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        const inTransaction = queryRunner.isTransactionActive;

        if (inTransaction) await queryRunner.commitTransaction();
        queryRunner.query(sql);

        if (inTransaction) await queryRunner.startTransaction();
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
