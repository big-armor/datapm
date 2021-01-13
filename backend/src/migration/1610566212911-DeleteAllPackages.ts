import { MigrationInterface, QueryRunner } from "typeorm";

export class DeleteAllPackages1610566212911 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        //     "Delete from user_package_permission;"
        return queryRunner.query("Delete from package");
    }

    public async down(queryRunner: QueryRunner): Promise<void> {}
}
