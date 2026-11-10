// Migración 2 (paso 2): amplía embarcaderos, agrega el modo a las rutas y los tiempos de la secuencia.
//
// - embarcaderos: tipo, margen, accesibilidad, foto_url y "estado", que reemplaza a "activo".
//   Conversión de datos: activo = true -> 'activo'; activo = false -> 'inactivo' (sin perder filas).
// - rutas: modo ('fluvial' por defecto; 'bus' en la fase 2).
// - ruta_embarcaderos: minutos_desde_origen y tiempo_estimado. Los minutos se estiman con la
//   regla B (10 min/km; cada tramo es el mayor entre la distancia por el trazado y la línea recta;
//   el primer embarcadero en 0) y quedan marcados como estimados.
//
// Escrita a mano a partir de la generada por TypeORM: la automática borraba "activo" antes de
// copiar sus valores. El SQL de los minutos se copia aquí a propósito (una migración no debe
// depender de código que puede cambiar después); la API usa src/rutas/tiempos-estimados.ts.

import { MigrationInterface, QueryRunner } from "typeorm";

export class AmpliarEmbarcaderosYTiempos1794290456536 implements MigrationInterface {
    name = 'AmpliarEmbarcaderosYTiempos1794290456536'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // ---------- embarcaderos ----------
        await queryRunner.query(`CREATE TYPE "public"."embarcaderos_tipo_enum" AS ENUM('embarcadero', 'parada_bus')`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" ADD "tipo" "public"."embarcaderos_tipo_enum" NOT NULL DEFAULT 'embarcadero'`);

        await queryRunner.query(`CREATE TYPE "public"."embarcaderos_margen_enum" AS ENUM('izquierda', 'derecha')`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" ADD "margen" "public"."embarcaderos_margen_enum"`);

        // estado: se crea, se llena desde "activo" y SOLO DESPUÉS se borra "activo"
        await queryRunner.query(`CREATE TYPE "public"."embarcaderos_estado_enum" AS ENUM('activo', 'cerrado_temporal', 'inactivo')`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" ADD "estado" "public"."embarcaderos_estado_enum" NOT NULL DEFAULT 'activo'`);
        await queryRunner.query(`
            UPDATE "embarcaderos"
            SET "estado" = CASE WHEN "activo" THEN 'activo' ELSE 'inactivo' END::"public"."embarcaderos_estado_enum"
        `);
        await queryRunner.query(`ALTER TABLE "embarcaderos" DROP COLUMN "activo"`);

        await queryRunner.query(`ALTER TABLE "embarcaderos" ADD "tiene_rampa" boolean`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" ADD "tiene_techo" boolean`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" ADD "tiene_iluminacion" boolean`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" ADD "foto_url" character varying(500)`);

        // ---------- rutas ----------
        await queryRunner.query(`CREATE TYPE "public"."rutas_modo_enum" AS ENUM('fluvial', 'bus')`);
        await queryRunner.query(`ALTER TABLE "rutas" ADD "modo" "public"."rutas_modo_enum" NOT NULL DEFAULT 'fluvial'`);

        // ---------- ruta_embarcaderos ----------
        await queryRunner.query(`ALTER TABLE "ruta_embarcaderos" ADD "minutos_desde_origen" smallint NOT NULL DEFAULT '0'`);
        await queryRunner.query(`ALTER TABLE "ruta_embarcaderos" ADD "tiempo_estimado" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`ALTER TABLE "ruta_embarcaderos" ADD CONSTRAINT "ck_minutos_desde_origen" CHECK ("minutos_desde_origen" >= 0)`);

        // Minutos estimados (regla B) para todas las secuencias existentes
        await queryRunner.query(`
            WITH base AS (
                SELECT re.ruta_sentido_id, re.embarcadero_id, re.orden, e.ubicacion,
                       CASE WHEN rs.trazado IS NOT NULL THEN
                           ST_Length(ST_LineSubstring(rs.trazado, 0, ST_LineLocatePoint(rs.trazado, e.ubicacion))::geography)
                       END AS m_sobre_trazado
                FROM ruta_embarcaderos re
                JOIN ruta_sentidos rs ON rs.id = re.ruta_sentido_id
                JOIN embarcaderos e ON e.id = re.embarcadero_id
            ),
            tramos AS (
                SELECT *,
                       COALESCE(greatest(
                           abs(m_sobre_trazado - lag(m_sobre_trazado) OVER w),
                           ST_Distance(ubicacion::geography, (lag(ubicacion) OVER w)::geography)
                       ), 0) AS tramo_m
                FROM base
                WINDOW w AS (PARTITION BY ruta_sentido_id ORDER BY orden)
            ),
            acumulado AS (
                SELECT ruta_sentido_id, embarcadero_id,
                       round(sum(tramo_m) OVER (PARTITION BY ruta_sentido_id ORDER BY orden) / 100) AS minutos
                FROM tramos
            )
            UPDATE ruta_embarcaderos re
            SET minutos_desde_origen = a.minutos, tiempo_estimado = true
            FROM acumulado a
            WHERE re.ruta_sentido_id = a.ruta_sentido_id AND re.embarcadero_id = a.embarcadero_id
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        // ---------- ruta_embarcaderos ----------
        await queryRunner.query(`ALTER TABLE "ruta_embarcaderos" DROP CONSTRAINT "ck_minutos_desde_origen"`);
        await queryRunner.query(`ALTER TABLE "ruta_embarcaderos" DROP COLUMN "tiempo_estimado"`);
        await queryRunner.query(`ALTER TABLE "ruta_embarcaderos" DROP COLUMN "minutos_desde_origen"`);

        // ---------- rutas ----------
        await queryRunner.query(`ALTER TABLE "rutas" DROP COLUMN "modo"`);
        await queryRunner.query(`DROP TYPE "public"."rutas_modo_enum"`);

        // ---------- embarcaderos ----------
        await queryRunner.query(`ALTER TABLE "embarcaderos" DROP COLUMN "foto_url"`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" DROP COLUMN "tiene_iluminacion"`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" DROP COLUMN "tiene_techo"`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" DROP COLUMN "tiene_rampa"`);

        // activo vuelve a llenarse desde estado: solo 'inactivo' pasa a false
        await queryRunner.query(`ALTER TABLE "embarcaderos" ADD "activo" boolean NOT NULL DEFAULT true`);
        await queryRunner.query(`UPDATE "embarcaderos" SET "activo" = ("estado" <> 'inactivo')`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" DROP COLUMN "estado"`);
        await queryRunner.query(`DROP TYPE "public"."embarcaderos_estado_enum"`);

        await queryRunner.query(`ALTER TABLE "embarcaderos" DROP COLUMN "margen"`);
        await queryRunner.query(`DROP TYPE "public"."embarcaderos_margen_enum"`);
        await queryRunner.query(`ALTER TABLE "embarcaderos" DROP COLUMN "tipo"`);
        await queryRunner.query(`DROP TYPE "public"."embarcaderos_tipo_enum"`);
    }

}
