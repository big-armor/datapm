import {MigrationInterface, QueryRunner} from "typeorm";


const sql = `

CREATE TABLE public."credential" (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id integer NOT NULL,
    encrypted_credentials TEXT NOT NULL,
    package_id INTEGER NOT NULL REFERENCES package (id) ON DELETE CASCADE,
    creator_id INTEGER NOT NULL REFERENCES public."user" (id) ON DELETE CASCADE,
    connector_type VARCHAR(256) NOT NULL,
    repository_identifier VARCHAR(256) NOT NULL,
    credential_identifier VARCHAR(256)
);

CREATE SEQUENCE public.credential_id_seq AS INTEGER
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1
    OWNED BY public."credential".id;

ALTER TABLE ONLY public."credential" ALTER COLUMN id SET DEFAULT nextval('public."credential_id_seq"'::regclass);


CREATE UNIQUE INDEX IF NOT EXISTS source_credential ON credential(package_id,connector_type,repository_identifier,credential_identifier);

`

export class Credentials1657502298106 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);

    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        throw new Error("Not implemented");
    }

}
