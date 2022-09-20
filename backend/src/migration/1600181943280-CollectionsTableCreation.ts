import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    -- Create collections table
    CREATE TABLE public."collection" (
        id integer NOT NULL PRIMARY KEY UNIQUE,
        name character varying(255) NOT NULL,
        slug character varying(256) NOT NULL UNIQUE,
        description text,
        is_recommended boolean DEFAULT FALSE NOT NULL,
        is_public boolean DEFAULT FALSE NOT NULL,
        is_active boolean DEFAULT TRUE NOT NULL,
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes on the name, is_recommended and is_public columns for faster queries
    CREATE INDEX idx_collection_name ON collection (name);
    CREATE UNIQUE INDEX idx_collection_slug ON collection (slug);
    CREATE INDEX idx_collection_is_recommended ON collection (is_recommended);
    CREATE INDEX idx_collection_is_public ON collection (is_public);
    CREATE INDEX idx_collection_is_active ON collection (is_active);

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


    -- Create permission type
    CREATE TYPE public.user_collection_permission_type AS ENUM (
        'NONE',
        'VIEW',
        'EDIT',
        'CREATE',
        'MANAGE',
        'DELETE'
    );

    ALTER TYPE public.user_collection_permission_type OWNER TO postgres;

    -- Link the collections and users with permissions
    CREATE TABLE public."collection_user" (
        user_id integer NOT NULL REFERENCES public."user" (id) ON DELETE CASCADE,
        collection_id integer NOT NULL REFERENCES collection (id) ON DELETE CASCADE,
        permissions public.user_collection_permission_type[] NOT NULL DEFAULT '{NONE}',
        created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
    );

    -- Create indexes for the relation table
    CREATE INDEX idx_collection_user_user_id ON collection_user (user_id);
    CREATE UNIQUE INDEX idx_collection_user_user_id_and_collection_id ON collection_user (user_id, collection_id);
`;

export class CollectionsTableCreation1600181943280 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
