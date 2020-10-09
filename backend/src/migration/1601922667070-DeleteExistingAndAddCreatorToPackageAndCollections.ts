import {MigrationInterface, QueryRunner} from "typeorm";

const SQL = `
    DELETE FROM public.version;
    DELETE FROM public.package;
    DELETE FROM public.collection;

    ALTER TABLE public.package ADD COLUMN managed_by_id integer NOT NULL;
    ALTER TABLE public.collection ADD COLUMN managed_by_id integer NOT NULL;
`;

export class DeleteExistingAndAddCreatorToPackageAndCollections1601922667070 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }
}
