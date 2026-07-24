import { MigrationInterface, QueryRunner } from "typeorm";

export class AddNetworkToDailyReportSettings1783800000000 implements MigrationInterface {
    name = "AddNetworkToDailyReportSettings1783800000000";

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "daily_report_settings" ADD "network" character varying NOT NULL DEFAULT 'mainnet'`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "daily_report_settings" DROP COLUMN "network"`);
    }
}
