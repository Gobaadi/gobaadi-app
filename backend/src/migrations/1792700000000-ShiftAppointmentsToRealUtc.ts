import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Slot times were historically parsed with server-local semantics, so stored
 * appointment instants sat 6 hours later than their Asia/Dhaka wall-clock
 * intent (e.g. a 10:00 AM Dhaka slot was stored as 10:00Z instead of 04:00Z).
 *
 * This shifts appointment instants back to real UTC so that:
 *  - device-local display (UTC+6) matches the slot labels,
 *  - reminders / call-gates / sweeps compare against true clock instants.
 *
 * createdAt/cancelledAt/rescheduledAt are recorded by now() and stay as-is.
 */
export class ShiftAppointmentsToRealUtc1792700000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE appointments SET "startAt" = "startAt" - interval '6 hours', "endAt" = "endAt" - interval '6 hours'`,
    );
    await queryRunner.query(
      `UPDATE appointments SET "originalStartAt" = "originalStartAt" - interval '6 hours' WHERE "originalStartAt" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `UPDATE appointments SET "startAt" = "startAt" + interval '6 hours', "endAt" = "endAt" + interval '6 hours'`,
    );
    await queryRunner.query(
      `UPDATE appointments SET "originalStartAt" = "originalStartAt" + interval '6 hours' WHERE "originalStartAt" IS NOT NULL`,
    );
  }
}
