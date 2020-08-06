import {MigrationInterface, QueryRunner} from "typeorm";


const sql = ``;

export class initDatabase1594340480968 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        throw new Error("Not Implemented");
    }

}
