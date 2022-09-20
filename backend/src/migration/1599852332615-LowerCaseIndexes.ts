import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `

    CREATE UNIQUE INDEX idx_catalog_slug ON catalog ((lower(slug)));
    CREATE UNIQUE INDEX idx_package_slug ON package ((lower(slug)));

    CREATE INDEX idx_package_displayName ON package ((lower(package."displayName")));
    CREATE INDEX idx_catalog_displayName ON catalog ((lower(catalog."displayName")));


    `;
export class LowerCaseIndexes1599852332615 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
