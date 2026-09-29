import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddNotificationTypes1786311774523 implements MigrationInterface {
  name = 'AddNotificationTypes1786311774523';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'message'`,
    );
    await queryRunner.query(
      `ALTER TYPE "public"."notifications_type_enum" ADD VALUE IF NOT EXISTS 'referral'`,
    );
  }

  public async down(): Promise<void> {
    // Postgres doesn't support removing enum values; down migrations for enum
    // additions are intentionally a no-op (same as dropping the value would
    // require rebuilding the type and rewriting every dependent row).
  }
}
