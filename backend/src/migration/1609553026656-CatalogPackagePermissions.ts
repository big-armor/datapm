import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `

    ALTER TABLE user_catalog ADD COLUMN package_permission user_package_permission_permission_enum[] NOT NULL DEFAULT '{}';
`;

export class CatalogPackagePermissions1609553026656 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
