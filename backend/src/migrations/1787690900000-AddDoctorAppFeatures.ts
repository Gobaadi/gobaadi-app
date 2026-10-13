import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Hand-authored rather than `migration:generate`d — the local dev DB is
 * stale relative to `main` in ways unrelated to this change (it would have
 * tried to re-create tables that already exist in every real environment),
 * so an auto-diff against it isn't trustworthy here. This contains only the
 * schema needed for the wallet, discounts, time-off, and medical-events
 * modules, plus the new appointment columns.
 */
export class AddDoctorAppFeatures1787690900000 implements MigrationInterface {
  name = 'AddDoctorAppFeatures1787690900000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // wallets
    await queryRunner.query(
      `CREATE TABLE "wallets" ("id" SERIAL NOT NULL, "userId" integer NOT NULL, "balance" double precision NOT NULL DEFAULT 0, CONSTRAINT "PK_wallets_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_wallets_userId" ON "wallets" ("userId")`,
    );

    // wallet_transactions
    await queryRunner.query(
      `CREATE TABLE "wallet_transactions" ("id" SERIAL NOT NULL, "walletId" integer NOT NULL, "amount" double precision NOT NULL, "reason" character varying NOT NULL, "referenceType" character varying, "referenceId" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_wallet_transactions_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_wallet_transactions_walletId" ON "wallet_transactions" ("walletId")`,
    );

    // patient_discounts
    await queryRunner.query(
      `CREATE TABLE "patient_discounts" ("id" SERIAL NOT NULL, "doctorId" integer NOT NULL, "patientId" integer NOT NULL, "percent" double precision NOT NULL, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_patient_discounts_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_discounts_doctorId" ON "patient_discounts" ("doctorId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_patient_discounts_patientId" ON "patient_discounts" ("patientId")`,
    );
    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_patient_discounts_doctorId_patientId" ON "patient_discounts" ("doctorId", "patientId")`,
    );

    // doctor_time_off
    await queryRunner.query(
      `CREATE TYPE "public"."doctor_time_off_reason_enum" AS ENUM('vacation', 'sick_leave', 'conference_training', 'emergency', 'other')`,
    );
    await queryRunner.query(
      `CREATE TABLE "doctor_time_off" ("id" SERIAL NOT NULL, "doctorId" integer NOT NULL, "startDate" date NOT NULL, "endDate" date NOT NULL, "reason" "public"."doctor_time_off_reason_enum" NOT NULL, "note" text, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_doctor_time_off_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_doctor_time_off_doctorId" ON "doctor_time_off" ("doctorId")`,
    );

    // medical_events
    await queryRunner.query(
      `CREATE TYPE "public"."medical_events_type_enum" AS ENUM('CONSULTATION', 'TREATMENT', 'VACCINATION', 'LAB_TEST')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."medical_events_status_enum" AS ENUM('ONGOING', 'COMPLETED')`,
    );
    await queryRunner.query(
      `CREATE TABLE "medical_events" ("id" SERIAL NOT NULL, "patientId" integer NOT NULL, "appointmentId" integer NOT NULL, "doctorId" integer NOT NULL, "type" "public"."medical_events_type_enum" NOT NULL, "status" "public"."medical_events_status_enum" NOT NULL DEFAULT 'ONGOING', "data" jsonb NOT NULL, "nextFollowUpAt" TIMESTAMP WITH TIME ZONE, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), "updatedAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "PK_medical_events_id" PRIMARY KEY ("id"))`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_medical_events_patientId" ON "medical_events" ("patientId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_medical_events_appointmentId" ON "medical_events" ("appointmentId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_medical_events_doctorId" ON "medical_events" ("doctorId")`,
    );

    // appointments: new columns
    await queryRunner.query(
      `CREATE TYPE "public"."appointments_consultationtype_enum" AS ENUM('online_video', 'online_voice', 'online_chat', 'physical')`,
    );
    await queryRunner.query(
      `CREATE TYPE "public"."appointments_cancellationreason_enum" AS ENUM('emergency', 'schedule_conflict', 'other')`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "animalId" integer`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "consultationType" "public"."appointments_consultationtype_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "reasonForConsultation" text`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "symptoms" text array`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "cancellationReason" "public"."appointments_cancellationreason_enum"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD "cancellationNote" text`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_animalId" ON "appointments" ("animalId")`,
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_appointments_consultationType" ON "appointments" ("consultationType")`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DROP INDEX "public"."IDX_appointments_consultationType"`,
    );
    await queryRunner.query(`DROP INDEX "public"."IDX_appointments_animalId"`);
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "cancellationNote"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "cancellationReason"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "symptoms"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "reasonForConsultation"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "consultationType"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP COLUMN "animalId"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."appointments_cancellationreason_enum"`,
    );
    await queryRunner.query(
      `DROP TYPE "public"."appointments_consultationtype_enum"`,
    );

    await queryRunner.query(`DROP TABLE "medical_events"`);
    await queryRunner.query(`DROP TYPE "public"."medical_events_status_enum"`);
    await queryRunner.query(`DROP TYPE "public"."medical_events_type_enum"`);

    await queryRunner.query(`DROP TABLE "doctor_time_off"`);
    await queryRunner.query(`DROP TYPE "public"."doctor_time_off_reason_enum"`);

    await queryRunner.query(`DROP TABLE "patient_discounts"`);

    await queryRunner.query(`DROP TABLE "wallet_transactions"`);

    await queryRunner.query(`DROP TABLE "wallets"`);
  }
}
