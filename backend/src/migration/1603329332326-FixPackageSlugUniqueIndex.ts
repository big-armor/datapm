import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    DROP INDEX idx_package_slug;
    CREATE UNIQUE INDEX idx_package_slug ON package ((lower(slug)),catalog_id);


`;
export class FixPackageSlugUniqueIndex1603329332326 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
