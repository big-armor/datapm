import {MigrationInterface, QueryRunner} from "typeorm";

const SQL = `
    -- Create collecitons table
    CREATE TABLE public."collection" (
        id integer NOT NULL PRIMARY KEY UNIQUE,
        name character varying(255) NOT NULL,
        description text,
        is_recommended boolean DEFAULT FALSE NOT NULL,
        is_public boolean DEFAULT FALSE NOT NULL,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes on the name, is_recommended and is_public columns for faster queries
    CREATE INDEX idx_collection_name ON collection (name);
    CREATE INDEX idx_collection_is_recommended ON collection (is_recommended);
    CREATE INDEX idx_collection_is_public ON collection (is_public);

    -- Create and add ID generation sequence to the id column so the numerical ID gets generated automatically by the database
    CREATE SEQUENCE public.collection_id_seq AS INTEGER
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    OWNED BY public.collection.id;

    ALTER TABLE public.collection_id_seq OWNER TO postgres;

    ALTER TABLE public.collection ALTER COLUMN id SET DEFAULT nextval('public.collection_id_seq');
`;

export class CollectionsTableCreation1600181943280 implements MigrationInterface {


    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
