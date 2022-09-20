import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    CREATE SEQUENCE public."activity_log_id_seq"
        AS integer
        START WITH 1
        INCREMENT BY 1
        NO MINVALUE
        NO MAXVALUE
        CACHE 1;

    ALTER TABLE ONLY public."activity_log" ALTER COLUMN id SET DEFAULT nextval('public."activity_log_id_seq"'::regclass);
`;

export class ActivityLogIncrementId1609772972965 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
