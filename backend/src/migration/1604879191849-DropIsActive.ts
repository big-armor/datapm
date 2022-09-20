import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE "collection" DROP COLUMN "is_active";

    ALTER TABLE "user" DROP COLUMN "is_active";
    ALTER TABLE "catalog" DROP COLUMN "isActive";
    ALTER TABLE "package" DROP COLUMN "isActive";
    ALTER TABLE "version" DROP COLUMN "isActive";
`;
export class DropIsActive1604879191849 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
