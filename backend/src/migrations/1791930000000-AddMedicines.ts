import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddMedicines1791930000000 implements MigrationInterface {
  name = 'AddMedicines1791930000000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS "medicines" (
        "id" SERIAL PRIMARY KEY,
        "name" text NOT NULL UNIQUE,
        "type" text NOT NULL,
        "sortOrder" integer NOT NULL DEFAULT 0,
        "createdAt" timestamptz NOT NULL DEFAULT now()
      )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "medicines"`);
  }
}
