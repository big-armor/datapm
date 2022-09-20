import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `

CREATE OR REPLACE FUNCTION updatePackageVectors()
RETURNS trigger AS '
BEGIN
IF NEW.description IS NOT NULL THEN
    NEW.description_tokens := to_tsvector(NEW.description);
ELSE
    NEW.description_tokens := NULL;
END IF;


IF NEW.displayName IS NOT NULL THEN
    NEW.displayName_tokens := to_tsvector(NEW.displayName);
ELSE
    NEW.displayName_tokens := NULL;
END IF;

RETURN NEW;
END' LANGUAGE 'plpgsql';


CREATE OR REPLACE FUNCTION updateCatalogVectors()
RETURNS trigger AS '
BEGIN
  IF NEW.description IS NOT NULL THEN
    NEW.description_tokens := to_tsvector(NEW.description);
  ELSE
    NEW.description_tokens := NULL;
  END IF;
  
  
  IF NEW.displayName IS NOT NULL THEN
    NEW.displayName_tokens := to_tsvector(NEW.displayName);
  ELSE
    NEW.displayName_tokens := NULL;
  END IF;
  
  RETURN NEW;
END' LANGUAGE 'plpgsql';
`;
export class FixIndexUpdateScript1600719428028 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
