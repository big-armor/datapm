import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `

DROP TABLE image;

`;
export class DropImageTable1604759899328 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
