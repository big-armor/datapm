import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUnclaimedLogTypesEnumToDbObject1625845662069 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.connection.query("ALTER TYPE activity_log_change_type_enum ADD VALUE 'UNCLAIMED_ENABLED'");
        await queryRunner.connection.query("ALTER TYPE activity_log_change_type_enum ADD VALUE 'UNCLAIMED_DISABLED'");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
