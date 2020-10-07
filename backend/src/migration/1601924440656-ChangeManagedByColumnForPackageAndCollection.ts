import {MigrationInterface, QueryRunner} from "typeorm";

const SQL = `
    ALTER TABLE public.package DROP COLUMN modified_by_id;
    ALTER TABLE public.collection DROP COLUMN modified_by_id;

    ALTER TABLE public.package ADD COLUMN managed_by_id integer NOT NULL;
    ALTER TABLE public.collection ADD COLUMN managed_by_id integer NOT NULL;
`;

export class ChangeManagedByColumnForPackageAndCollection1601924440656 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
