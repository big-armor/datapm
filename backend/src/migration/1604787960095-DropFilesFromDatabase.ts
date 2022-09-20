import { MigrationInterface, QueryRunner } from "typeorm";
const sql = `
    ALTER TABLE "public"."version" DROP COLUMN "packageFile";
    ALTER TABLE "public"."version" DROP COLUMN readme_file;
    ALTER TABLE "public"."version" DROP COLUMN license_file;
    DROP TRIGGER updateVersionVectors ON version;
    DROP FUNCTION updateVersionVectors;

    `;
export class DropFilesFromDatabase1604787960095 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
