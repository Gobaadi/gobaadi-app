import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Rebrands the patient/farmer role from 'user' to 'farm_owner'.
 *
 * Renames the enum label in place (existing row values follow the enum OID),
 * then resets the users.role column default which stores the label literally.
 * Guarded with existence checks so re-running is safe.
 */
export class RenameUserRoleToFarmOwner1792600000000 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'farm_owner'
        ) THEN
          ALTER TYPE users_role_enum RENAME VALUE 'user' TO 'farm_owner';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'chat_messages_senderrole_enum' AND e.enumlabel = 'farm_owner'
        ) THEN
          ALTER TYPE chat_messages_senderrole_enum RENAME VALUE 'user' TO 'farm_owner';
        END IF;
      END $$;
    `);
    await queryRunner.query(
      `ALTER TABLE users ALTER COLUMN role SET DEFAULT 'farm_owner'::users_role_enum`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE users ALTER COLUMN role SET DEFAULT 'user'::users_role_enum`,
    );
    await queryRunner.query(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'users_role_enum' AND e.enumlabel = 'user'
        ) THEN
          ALTER TYPE users_role_enum RENAME VALUE 'farm_owner' TO 'user';
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_enum e
          JOIN pg_type t ON t.oid = e.enumtypid
          WHERE t.typname = 'chat_messages_senderrole_enum' AND e.enumlabel = 'user'
        ) THEN
          ALTER TYPE chat_messages_senderrole_enum RENAME VALUE 'farm_owner' TO 'user';
        END IF;
      END $$;
    `);
  }
}
