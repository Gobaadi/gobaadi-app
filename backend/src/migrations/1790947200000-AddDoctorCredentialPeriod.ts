import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorCredentialPeriod1790947200000 implements MigrationInterface {
  name = 'AddDoctorCredentialPeriod1790947200000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "credentialPeriod" jsonb`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP COLUMN IF EXISTS "credentialPeriod"`,
    );
  }
}
