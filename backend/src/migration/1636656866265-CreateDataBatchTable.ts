import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
CREATE TABLE public.batch (
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP NOT NULL,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    id serial,
    major_version integer NOT NULL,
    package_id integer NOT NULL REFERENCES public.package(id) ON DELETE CASCADE,
    batch integer NOT NULL,
    author_id integer NOT NULL REFERENCES public.user(id) ON DELETE CASCADE,
    "default" boolean DEFAULT true NOT NULL,
    schemaTitle TEXT NOT NULL,
    streamSlug TEXT NOT NULL
);

ALTER TABLE public.batch ADD PRIMARY KEY (id);

ALTER TABLE public.batch ADD COLUMN lastoffset bigint DEFAULT -1 NOT NULL;

ALTER TABLE public.batch ADD COLUMN streamSetSlug TEXT NOT NULL;

ALTER TABLE public.batch ADD COLUMN sourceType TEXT NOT NULL;

ALTER TABLE public.batch ADD COLUMN sourceSlug TEXT NOT NULL;

ALTER TABLE "batch" ADD CONSTRAINT uniqueBatchesPerPackage UNIQUE(package_id,major_version,sourceType,sourceSlug,streamSetSlug,streamSlug,schematitle,batch);

create unique index one_default_batch_per_package_major_version on public.batch(package_id,major_version,sourceType,sourceSlug,streamSetSlug,streamSlug,schematitle,"default") where "default" is true;
`;

export class CreateDataBatchTable1636656866265 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
