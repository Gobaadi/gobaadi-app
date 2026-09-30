import { MigrationInterface, QueryRunner } from 'typeorm';

export class CascadeDoctorAndAdminDeletes1790769417366 implements MigrationInterface {
  name = 'CascadeDoctorAndAdminDeletes1790769417366';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `DELETE FROM "appointments" WHERE "doctorId" NOT IN (SELECT "id" FROM "doctors")`,
    );
    await queryRunner.query(
      `DELETE FROM "conversations" WHERE "doctorId" NOT IN (SELECT "id" FROM "doctors")`,
    );
    await queryRunner.query(
      `DELETE FROM "conversations" WHERE "doctorUserId" IS NOT NULL AND "doctorUserId" NOT IN (SELECT "id" FROM "users")`,
    );
    await queryRunner.query(
      `DELETE FROM "patient_discounts" WHERE "doctorId" NOT IN (SELECT "id" FROM "doctors")`,
    );
    await queryRunner.query(
      `DELETE FROM "doctor_availability" WHERE "doctorId" NOT IN (SELECT "id" FROM "doctors")`,
    );
    await queryRunner.query(
      `DELETE FROM "medical_events" WHERE "doctorId" NOT IN (SELECT "id" FROM "doctors")`,
    );
    await queryRunner.query(
      `DELETE FROM "prescriptions" WHERE "doctorId" NOT IN (SELECT "id" FROM "doctors")`,
    );
    await queryRunner.query(
      `DELETE FROM "doctor_time_off" WHERE "doctorId" NOT IN (SELECT "id" FROM "doctors")`,
    );
    await queryRunner.query(
      `DELETE FROM "video_sessions" WHERE "doctorUserId" IS NOT NULL AND "doctorUserId" NOT IN (SELECT "id" FROM "users")`,
    );
    await queryRunner.query(
      `DELETE FROM "admin_refresh_tokens" WHERE "adminId" NOT IN (SELECT "id" FROM "admins")`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP CONSTRAINT "FK_55651e05e46413d510215535edf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD CONSTRAINT "FK_55651e05e46413d510215535edf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" ADD CONSTRAINT "FK_0c1af27b469cb8dca420c160d65" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_d6fc67758d8e1a687709d26b27e" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" ADD CONSTRAINT "FK_4871127e57f05a316739e4d27d6" FOREIGN KEY ("doctorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_discounts" ADD CONSTRAINT "FK_f6ce6f033252882fd484cd2f6c3" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_availability" ADD CONSTRAINT "FK_7ebf8396e8918307342d6bcf82b" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_events" ADD CONSTRAINT "FK_bcf0da67f5b02e3a5b8d61264d3" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescriptions" ADD CONSTRAINT "FK_42c70415fad4505386e6d7e9dc4" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_time_off" ADD CONSTRAINT "FK_892cd5ca388e04c96295b576d63" FOREIGN KEY ("doctorId") REFERENCES "doctors"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_sessions" ADD CONSTRAINT "FK_a803f27278f946fdcd57aa59d9f" FOREIGN KEY ("doctorUserId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
    await queryRunner.query(
      `ALTER TABLE "admin_refresh_tokens" ADD CONSTRAINT "FK_9a2e8e4c20062acd77e11b27577" FOREIGN KEY ("adminId") REFERENCES "admins"("id") ON DELETE CASCADE ON UPDATE NO ACTION`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "admin_refresh_tokens" DROP CONSTRAINT "FK_9a2e8e4c20062acd77e11b27577"`,
    );
    await queryRunner.query(
      `ALTER TABLE "video_sessions" DROP CONSTRAINT "FK_a803f27278f946fdcd57aa59d9f"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_time_off" DROP CONSTRAINT "FK_892cd5ca388e04c96295b576d63"`,
    );
    await queryRunner.query(
      `ALTER TABLE "prescriptions" DROP CONSTRAINT "FK_42c70415fad4505386e6d7e9dc4"`,
    );
    await queryRunner.query(
      `ALTER TABLE "medical_events" DROP CONSTRAINT "FK_bcf0da67f5b02e3a5b8d61264d3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctor_availability" DROP CONSTRAINT "FK_7ebf8396e8918307342d6bcf82b"`,
    );
    await queryRunner.query(
      `ALTER TABLE "patient_discounts" DROP CONSTRAINT "FK_f6ce6f033252882fd484cd2f6c3"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_4871127e57f05a316739e4d27d6"`,
    );
    await queryRunner.query(
      `ALTER TABLE "conversations" DROP CONSTRAINT "FK_d6fc67758d8e1a687709d26b27e"`,
    );
    await queryRunner.query(
      `ALTER TABLE "appointments" DROP CONSTRAINT "FK_0c1af27b469cb8dca420c160d65"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" DROP CONSTRAINT "FK_55651e05e46413d510215535edf"`,
    );
    await queryRunner.query(
      `ALTER TABLE "doctors" ADD CONSTRAINT "FK_55651e05e46413d510215535edf" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`,
    );
  }
}
