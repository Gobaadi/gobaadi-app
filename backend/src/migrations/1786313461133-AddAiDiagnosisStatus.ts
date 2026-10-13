import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddAiDiagnosisStatus1786313461133 implements MigrationInterface {
  name = 'AddAiDiagnosisStatus1786313461133';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."ai_diagnoses_status_enum" AS ENUM('PENDING', 'READY', 'FAILED')`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ADD "status" "public"."ai_diagnoses_status_enum" NOT NULL DEFAULT 'READY'`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ADD "failureReason" character varying`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ALTER COLUMN "analysisResult" DROP NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ALTER COLUMN "confidenceScore" DROP NOT NULL`,
    );
    // No production data to preserve locally — drop the old jsonb column and
    // recreate as text[] to match the app's string[] contract.
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" DROP COLUMN "recommendations"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ADD "recommendations" text array NOT NULL DEFAULT '{}'`,
    );
    // The default above only exists to satisfy NOT NULL for any pre-existing
    // rows; new rows always set status explicitly via the application.
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ALTER COLUMN "status" DROP DEFAULT`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" DROP COLUMN "recommendations"`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ADD "recommendations" jsonb`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ALTER COLUMN "confidenceScore" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" ALTER COLUMN "analysisResult" SET NOT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "ai_diagnoses" DROP COLUMN "failureReason"`,
    );
    await queryRunner.query(`ALTER TABLE "ai_diagnoses" DROP COLUMN "status"`);
    await queryRunner.query(`DROP TYPE "public"."ai_diagnoses_status_enum"`);
  }
}
