import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `


alter table public."version"
drop constraint "FK_2bc1bd51e8ca9ed656bf6409e32";

alter table public."version"
add constraint "FK_2bc1bd51e8ca9ed656bf6409e32"
   foreign key (package_id)
   references public.package(id)
   on delete cascade;

   `;
export class PackageVersionFKFix1602260763029 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
