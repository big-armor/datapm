import { MigrationInterface, QueryRunner } from "typeorm";

const sql = `
    ALTER TABLE "public"."user" ADD COLUMN "gitHubHandle" VARCHAR(255) DEFAULT NULL;

    ALTER TABLE "public"."user" ADD COLUMN "locationIsPublic" boolean DEFAULT false NOT NULL;
    ALTER TABLE "public"."user" ADD COLUMN "twitterHandleIsPublic" boolean DEFAULT false NOT NULL;
    ALTER TABLE "public"."user" ADD COLUMN "gitHubHandleIsPublic" boolean DEFAULT false NOT NULL;
    ALTER TABLE "public"."user" ADD COLUMN "emailAddressIsPublic" boolean DEFAULT false NOT NULL;
    ALTER TABLE "public"."user" ADD COLUMN "websiteIsPublic" boolean DEFAULT false NOT NULL;

`;

export class UserProperties1602960936351 implements MigrationInterface {
    public async up(queryRunner: QueryRunner): Promise<void> {
        queryRunner.query(sql);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // no-op
    }
}
