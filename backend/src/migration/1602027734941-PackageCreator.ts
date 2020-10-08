import {MigrationInterface, QueryRunner} from "typeorm";



const sql = `
DELETE FROM public.package;
ALTER TABLE public.package ADD COLUMN creator_id BIGINT NOT NULL; 
ALTER TABLE ONLY public.package ADD CONSTRAINT "FK_package_creator_user" FOREIGN KEY (creator_id) REFERENCES public.user(id) ON DELETE CASCADE;
`
export class PackageCreator1602027734941 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}