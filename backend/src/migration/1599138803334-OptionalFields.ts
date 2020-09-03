import {MigrationInterface, QueryRunner} from "typeorm";

const SQL = `
    ALTER TABLE package ALTER COLUMN description DROP NOT NULL;
    ALTER TABLE catalog ALTER COLUMN description DROP NOT NULL;
`;

export class OptionalFields1599138803334 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(SQL);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
