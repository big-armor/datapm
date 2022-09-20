import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `

CREATE TABLE public."repository" (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    package_id INTEGER NOT NULL REFERENCES package (id) ON DELETE CASCADE,
    creator_id INTEGER NOT NULL REFERENCES public."user" (id) ON DELETE CASCADE,
    connector_type VARCHAR(256) NOT NULL,
    connection_configuration TEXT NOT NULL,
    repository_identifier VARCHAR(256) NOT NULL
);


CREATE SEQUENCE public.repository_id_seq AS INTEGER
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    OWNED BY public."repository".id;

ALTER TABLE ONLY public."repository" ALTER COLUMN id SET DEFAULT nextval('public."repository_id_seq"'::regclass);

CREATE UNIQUE INDEX IF NOT EXISTS uniqueRepositories ON repository(package_id,connector_type,repository_identifier);

ALTER TABLE public.repository ADD CONSTRAINT repository_pkey PRIMARY KEY (id);



CREATE TABLE public."credential" (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    encrypted_credentials TEXT NOT NULL,
    repository_id INTEGER NOT NULL REFERENCES repository (id) ON DELETE CASCADE,
    creator_id INTEGER NOT NULL REFERENCES public."user" (id) ON DELETE CASCADE,
    credential_identifier VARCHAR(256) NOT NULL
);

CREATE SEQUENCE public.credential_id_seq AS INTEGER
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    OWNED BY public."credential".id;

ALTER TABLE ONLY public."credential" ALTER COLUMN id SET DEFAULT nextval('public."credential_id_seq"'::regclass);


CREATE UNIQUE INDEX IF NOT EXISTS source_credential ON credential(repository_id,credential_identifier);

ALTER TABLE public.credential ADD CONSTRAINT credential_pkey PRIMARY KEY (id);

`;

export class Credentials1657502298106 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        throw new Error("Not implemented");
    }
}
