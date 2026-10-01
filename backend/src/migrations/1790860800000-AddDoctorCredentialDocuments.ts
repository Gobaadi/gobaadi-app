import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDoctorCredentialDocuments1790860800000 implements MigrationInterface {
  name = 'AddDoctorCredentialDocuments1790860800000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD COLUMN IF NOT EXISTS "credentialDocuments" text array NOT NULL DEFAULT '{}'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP COLUMN IF EXISTS "credentialDocuments"`,
    );
  }
}
