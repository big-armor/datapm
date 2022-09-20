import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE user_catalog RENAME COLUMN package_permission TO package_permissions;
    ALTER TABLE group_catalog_permissions alter column package_permissions drop DEFAULT;
    ALTER TABLE group_catalog_permissions ALTER COLUMN package_permissions TYPE user_package_permission_permission_enum[] USING package_permissions::user_catalog_permission_enum[]::text[]::user_package_permission_permission_enum[];
    ALTER TABLE group_catalog_permissions ALTER COLUMN package_permissions SET DEFAULT '{}';
`;

export class PackagePermissions1662041798173 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
