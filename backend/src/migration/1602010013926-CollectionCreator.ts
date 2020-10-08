import {MigrationInterface, QueryRunner} from "typeorm";

const sql = `
DELETE FROM public.collection;
ALTER TABLE public.collection ADD COLUMN creator_id BIGINT NOT NULL; 

ALTER TABLE ONLY public.collection ADD CONSTRAINT "FK_collection_user" FOREIGN KEY (creator_id) REFERENCES public.user(id) ON DELETE CASCADE;
`
export class CollectionCreator1602010013926 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}