import { MigrationInterface, QueryRunner } from "typeorm";

export class DropAllPackages1612120939472 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query("Delete from package");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
