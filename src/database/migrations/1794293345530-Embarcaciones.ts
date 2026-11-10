// Migración 4 (paso 7): tabla embarcaciones (código único, nombre, capacidad > 0, estado operativa/mantenimiento).
// Solo crea objetos nuevos; no modifica datos existentes. Generada con TypeORM y revisada.

import { MigrationInterface, QueryRunner } from "typeorm";

export class Embarcaciones1794293345530 implements MigrationInterface {
    name = 'Embarcaciones1794293345530'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."embarcaciones_estado_enum" AS ENUM('operativa', 'mantenimiento')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."embarcaciones_tipo_enum" AS ENUM('embarcacion', 'bus')
        `);
        await queryRunner.query(`
            CREATE TABLE "embarcaciones" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "codigo" character varying(20) NOT NULL,
                "nombre" character varying(120) NOT NULL,
                "capacidad" smallint NOT NULL,
                "estado" "public"."embarcaciones_estado_enum" NOT NULL DEFAULT 'operativa',
                "tipo" "public"."embarcaciones_tipo_enum" NOT NULL DEFAULT 'embarcacion',
                "observaciones" text,
                "es_oficial" boolean NOT NULL DEFAULT false,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_71022fad64c72be441113b557e4" UNIQUE ("codigo"),
                CONSTRAINT "ck_embarcaciones_capacidad" CHECK ("capacidad" > 0),
                CONSTRAINT "PK_3573567740316cd70d1e12c6806" PRIMARY KEY ("id")
            )
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DROP TABLE "embarcaciones"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."embarcaciones_tipo_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."embarcaciones_estado_enum"
        `);
    }

}
