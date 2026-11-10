// Migración 3 (paso 4): tabla avisos_servicio (suspensiones, retrasos, cambios de horario e informativos).
// Solo crea objetos nuevos; no modifica datos existentes. Generada con TypeORM y revisada.

import { MigrationInterface, QueryRunner } from "typeorm";

export class AvisosDeServicio1794291701526 implements MigrationInterface {
    name = 'AvisosDeServicio1794291701526'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TYPE "public"."avisos_servicio_tipo_enum" AS ENUM(
                'suspendido',
                'retraso',
                'cambio_horario',
                'informativo'
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."avisos_servicio_motivo_enum" AS ENUM('nivel_rio', 'clima', 'mantenimiento', 'otro')
        `);
        await queryRunner.query(`
            CREATE TABLE "avisos_servicio" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "tipo" "public"."avisos_servicio_tipo_enum" NOT NULL,
                "motivo" "public"."avisos_servicio_motivo_enum" NOT NULL DEFAULT 'otro',
                "titulo" character varying(120) NOT NULL,
                "mensaje" text NOT NULL,
                "ruta_id" uuid,
                "embarcadero_id" uuid,
                "vigente_desde" TIMESTAMP WITH TIME ZONE NOT NULL,
                "vigente_hasta" TIMESTAMP WITH TIME ZONE,
                "creado_por" uuid,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "ck_avisos_fechas" CHECK (
                    "vigente_hasta" IS NULL
                    OR "vigente_hasta" > "vigente_desde"
                ),
                CONSTRAINT "PK_98810dcda9433c043f4ca80b0aa" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "ix_avisos_vigencia" ON "avisos_servicio" ("vigente_desde", "vigente_hasta")
        `);
        await queryRunner.query(`
            ALTER TABLE "avisos_servicio"
            ADD CONSTRAINT "FK_7e2d754a3192294d23a4ef5a5fa" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "avisos_servicio"
            ADD CONSTRAINT "FK_e3a40a7e53b2ee8dc268d569d41" FOREIGN KEY ("embarcadero_id") REFERENCES "embarcaderos"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "avisos_servicio"
            ADD CONSTRAINT "FK_828bce6ac3641583546becc65cf" FOREIGN KEY ("creado_por") REFERENCES "usuarios"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "avisos_servicio" DROP CONSTRAINT "FK_828bce6ac3641583546becc65cf"
        `);
        await queryRunner.query(`
            ALTER TABLE "avisos_servicio" DROP CONSTRAINT "FK_e3a40a7e53b2ee8dc268d569d41"
        `);
        await queryRunner.query(`
            ALTER TABLE "avisos_servicio" DROP CONSTRAINT "FK_7e2d754a3192294d23a4ef5a5fa"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ix_avisos_vigencia"
        `);
        await queryRunner.query(`
            DROP TABLE "avisos_servicio"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."avisos_servicio_motivo_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."avisos_servicio_tipo_enum"
        `);
    }

}
