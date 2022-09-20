import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `

    ALTER TABLE "public"."version" ADD COLUMN "readme_file" VARCHAR(10240);
    ALTER TABLE "public"."version" ADD COLUMN "license_file" VARCHAR(10240);

    ALTER TABLE "public"."package" ADD COLUMN readme_file_vectors TSVECTOR;

    CREATE OR REPLACE FUNCTION updateVersionVectors()
    RETURNS trigger AS '
    BEGIN
    IF NEW.readme_file IS NOT NULL THEN
        UPDATE "public"."package" SET readme_file_vectors = to_tsvector(NEW.readme_file) WHERE id = NEW.package_id;
    ELSE
        UPDATE "public"."package" SET readme_file_vectors = NULL WHERE id = NEW.package_id;
    END IF;
    
    RETURN NEW;
    END' LANGUAGE 'plpgsql';

    DROP TRIGGER IF EXISTS updateVersionVectors ON version;
    CREATE TRIGGER updateVersionVectors BEFORE INSERT or UPDATE on version FOR EACH ROW EXECUTE PROCEDURE updateVersionVectors();

`;

export class AddVersionReadmeAndLicense1604719596366 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
