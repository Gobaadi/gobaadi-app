import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorLocation1791561600000 implements MigrationInterface {
  name = 'AddDoctorLocation1791561600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "location" varchar`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP COLUMN IF EXISTS "location"`,
    );
  }
}
