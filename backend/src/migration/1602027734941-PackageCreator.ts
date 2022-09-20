import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `


alter table public."version"
drop constraint "FK_2bc1bd51e8ca9ed656bf6409e32";

alter table public."version"
add constraint "FK_2bc1bd51e8ca9ed656bf6409e32"
   foreign key (package_id)
   references public.package(id)
   on delete cascade;

DELETE FROM public.package;
ALTER TABLE public.package ADD COLUMN creator_id BIGINT  NOT NULL;
ALTER TABLE ONLY public.package ADD CONSTRAINT "FK_package_creator_user" FOREIGN KEY (creator_id) REFERENCES public.user(id) ON DELETE CASCADE;

`;
export class PackageCreator1602027734941 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
