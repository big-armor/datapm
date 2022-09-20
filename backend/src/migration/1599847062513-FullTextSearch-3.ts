import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    

    CREATE OR REPLACE FUNCTION updatePackageVectors()
    RETURNS trigger AS '
    BEGIN
    IF NEW.description IS NOT NULL THEN
        NEW.description_vectors := to_tsvector(NEW.description);
    ELSE
        NEW.description_vecotrs := NULL;
    END IF;
    
    
    IF NEW.displayName IS NOT NULL THEN
        NEW.displayName_vectors := to_tsvector(NEW.displayName);
    ELSE
        NEW.displayName_vectors := NULL;
    END IF;
    
    RETURN NEW;
    END' LANGUAGE 'plpgsql';

    DROP TRIGGER IF EXISTS updatePackageVectors ON package;
    CREATE TRIGGER updatePackageVectors BEFORE INSERT or UPDATE on package FOR EACH ROW EXECUTE PROCEDURE updatePackageVectors();

    ALTER TABLE catalog ADD COLUMN displayName_tokens TSVECTOR;
    ALTER TABLE catalog ADD COLUMN description_tokens TSVECTOR;
    UPDATE catalog SET displayName_tokens = to_tsvector(catalog."displayName"), description_tokens = to_tsvector(description);

    CREATE OR REPLACE FUNCTION updateCatalogVectors()
    RETURNS trigger AS '
    BEGIN
      IF NEW.description IS NOT NULL THEN
        NEW.description_vectors := to_tsvector(NEW.description);
      ELSE
        NEW.description_vecotrs := NULL;
      END IF;
      
      
      IF NEW.displayName IS NOT NULL THEN
        NEW.displayName_vectors := to_tsvector(NEW.displayName);
      ELSE
        NEW.displayName_vectors := NULL;
      END IF;
      
      RETURN NEW;
    END' LANGUAGE 'plpgsql';
    DROP TRIGGER IF EXISTS updateCatalogVectors ON catalog;
    CREATE TRIGGER updateCatalogVectors BEFORE INSERT or UPDATE on catalog
    FOR EACH ROW EXECUTE PROCEDURE updateCatalogVectors();
`;

export class FullTextSearch31599847062513 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
