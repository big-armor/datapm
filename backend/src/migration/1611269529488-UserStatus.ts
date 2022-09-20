import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `

    CREATE TYPE public.user_status_enum AS ENUM (
        'PENDING_SIGN_UP',
        'ACTIVE',
        'SUSPENDED'
    );

    ALTER TABLE public.user ADD COLUMN status public."user_status_enum" NOT NULL DEFAULT 'ACTIVE'
    
`;
export class UserStatus1611269529488 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
