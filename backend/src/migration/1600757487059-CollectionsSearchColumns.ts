import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    ALTER TABLE collection ADD COLUMN IF NOT EXISTS name_tokens TSVECTOR;
    ALTER TABLE collection ADD COLUMN IF NOT EXISTS description_tokens TSVECTOR;

    UPDATE collection SET name_tokens = to_tsvector(name), description_tokens = to_tsvector(description);

    CREATE OR REPLACE FUNCTION updateCollectionTokens() RETURNS TRIGGER AS '
        BEGIN
            IF NEW.name IS NOT NULL THEN
                NEW.name_tokens := to_tsvector(NEW.name);
            ELSE
                NEW.name_tokens := NULL;
            END IF;

            IF NEW.description IS NOT NULL THEN
                NEW.description_tokens := to_tsvector(NEW.description);
            ELSE
                NEW.description_tokens := NULL;
            END IF;
        RETURN NEW;
        END'
    LANGUAGE 'plpgsql';

    DROP TRIGGER IF EXISTS updateCollectionTokens ON collection;
    CREATE TRIGGER updateCollectionTokens BEFORE INSERT or UPDATE on collection FOR EACH ROW EXECUTE PROCEDURE updateCollectionTokens();
`;

export class CollectionsSearchColumns1600757487059 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
