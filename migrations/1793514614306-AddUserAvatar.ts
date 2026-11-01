import { MigrationInterface, QueryRunner } from "typeorm";

export class AddUserAvatar1793514614306 implements MigrationInterface {
    name = 'AddUserAvatar1793514614306'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "avatarOriginalName" character varying(260)`);
        await queryRunner.query(`ALTER TABLE "users" ADD "avatarStoredName" character varying(260)`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarStoredName"`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "avatarOriginalName"`);
    }

}
