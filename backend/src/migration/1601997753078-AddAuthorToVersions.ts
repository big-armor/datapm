import { MigrationInterface, QueryRunner } from "typeorm";

const SQL = `
    -- Add the author_id column to the version table
    ALTER TABLE public.version ADD COLUMN IF NOT EXISTS author_id INTEGER REFERENCES public.user(id) DEFAULT NULL;
    
    -- Migrate the current versions to the first user found in the table
    UPDATE public.version SET author_id = (SELECT id FROM public.user WHERE 1=1 LIMIT 1);
`;

export class AddAuthorToVersions1601997753078 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
