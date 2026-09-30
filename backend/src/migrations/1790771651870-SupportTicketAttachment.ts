import { MigrationInterface, QueryRunner } from "typeorm";

export class SupportTicketAttachment1790771651870 implements MigrationInterface {
    name = 'SupportTicketAttachment1790771651870'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "attachmentUrl" character varying`);
        await queryRunner.query(`ALTER TABLE "support_tickets" ADD "attachmentFileName" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "attachmentFileName"`);
        await queryRunner.query(`ALTER TABLE "support_tickets" DROP COLUMN "attachmentUrl"`);
    }

}
