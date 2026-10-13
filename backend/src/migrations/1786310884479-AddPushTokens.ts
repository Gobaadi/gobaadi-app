import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddPushTokens1786310884479 implements MigrationInterface {
  name = 'AddPushTokens1786310884479';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "push_tokens" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "token" character varying NOT NULL, "deviceId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_push_tokens_token" UNIQUE ("token"), CONSTRAINT "PK_push_tokens_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_push_tokens_userId" ON "push_tokens" ("userId")`,
    );
    await queryRunner.query(
      `ALTER TABLE "push_tokens" ADD CONSTRAINT "FK_push_tokens_userId" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "push_tokens" DROP CONSTRAINT "FK_push_tokens_userId"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_push_tokens_userId"`);
    await queryRunner.query(`DROP TABLE "push_tokens"`);
  }
}
