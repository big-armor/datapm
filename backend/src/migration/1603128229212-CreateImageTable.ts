import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    CREATE TABLE IF NOT EXISTS public."image" (
        id character varying(255) NOT NULL,
        user_id INTEGER REFERENCES public.user(id) NOT NULL,
        reference_entity_id INTEGER NOT NULL,
        image_type character varying(255) NOT NULL,
        mime_type character varying(255) NOT NULL,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
    );
    
    CREATE INDEX ON image(image_type); 
    CREATE INDEX ON image(reference_entity_id); 
`;

export class CreateImageTable1603128229212 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        return queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
