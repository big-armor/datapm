import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteAllPackages1610566212911 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query("Delete from package");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
