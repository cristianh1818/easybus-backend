// Migración 1: esquema inicial de EASYBUS (las 10 tablas del modelo de datos).
// Generada con TypeORM a partir de las entidades, tal como estaba la base antes de pasar a migraciones.
// En la base de desarrollo existente se marcó como ya aplicada (migration:run --fake),
// porque esas tablas ya existían; en un servidor nuevo las crea desde cero.

import { MigrationInterface, QueryRunner } from "typeorm";

export class EsquemaInicial1794288998557 implements MigrationInterface {
    name = 'EsquemaInicial1794288998557'

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Extensiones: PostGIS (geometrías) y uuid-ossp (uuid_generate_v4 para los id)
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS postgis`);
        await queryRunner.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp"`);
        await queryRunner.query(`
            CREATE TYPE "public"."usuarios_rol_enum" AS ENUM('pasajero', 'administrador')
        `);
        await queryRunner.query(`
            CREATE TABLE "usuarios" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "nombre" character varying(120) NOT NULL,
                "correo" character varying(160) NOT NULL,
                "contrasena_hash" character varying NOT NULL,
                "rol" "public"."usuarios_rol_enum" NOT NULL DEFAULT 'pasajero',
                "activo" boolean NOT NULL DEFAULT true,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_63665765c1a778a770c9bd585d3" UNIQUE ("correo"),
                CONSTRAINT "PK_d7281c63c176e152e4c531594a8" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."auditoria_accion_enum" AS ENUM('crear', 'actualizar', 'eliminar')
        `);
        await queryRunner.query(`
            CREATE TABLE "auditoria" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "usuario_id" uuid,
                "entidad" character varying(60) NOT NULL,
                "entidad_id" character varying(80) NOT NULL,
                "accion" "public"."auditoria_accion_enum" NOT NULL,
                "datos_previos" jsonb,
                "datos_nuevos" jsonb,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_135fe98308816fe3a2d458e6637" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "ix_auditoria_entidad" ON "auditoria" ("entidad", "entidad_id")
        `);
        await queryRunner.query(`
            CREATE TABLE "dias_festivos" (
                "fecha" date NOT NULL,
                "nombre" character varying(120) NOT NULL,
                CONSTRAINT "PK_a79b2a9ce27c2cc2b6474620ace" PRIMARY KEY ("fecha")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "embarcaderos" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "nombre" character varying(120) NOT NULL,
                "referencia" character varying(200),
                "ubicacion" geometry(Point, 4326) NOT NULL,
                "activo" boolean NOT NULL DEFAULT true,
                "es_oficial" boolean NOT NULL DEFAULT false,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_d185801e19c9d975c265c347b51" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_7864d85bb0824d3fa861302838" ON "embarcaderos" USING gist ("ubicacion")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."rutas_estado_enum" AS ENUM('activa', 'inactiva')
        `);
        await queryRunner.query(`
            CREATE TABLE "rutas" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "codigo" character varying(20) NOT NULL,
                "nombre" character varying(120) NOT NULL,
                "descripcion" text,
                "color" character varying(7),
                "estado" "public"."rutas_estado_enum" NOT NULL DEFAULT 'activa',
                "es_oficial" boolean NOT NULL DEFAULT false,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "UQ_3e124d911cc0232d53384f7b4bf" UNIQUE ("codigo"),
                CONSTRAINT "PK_80408b869ec5168c98210b8eba8" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "ruta_embarcaderos" (
                "ruta_sentido_id" uuid NOT NULL,
                "embarcadero_id" uuid NOT NULL,
                "orden" smallint NOT NULL,
                CONSTRAINT "uq_ruta_sentido_orden" UNIQUE ("ruta_sentido_id", "orden"),
                CONSTRAINT "PK_08acb4c2392584ff5936ccbb397" PRIMARY KEY ("ruta_sentido_id", "embarcadero_id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."ruta_sentidos_sentido_enum" AS ENUM('ida', 'vuelta')
        `);
        await queryRunner.query(`
            CREATE TABLE "ruta_sentidos" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "ruta_id" uuid NOT NULL,
                "sentido" "public"."ruta_sentidos_sentido_enum" NOT NULL,
                "destino" character varying(120) NOT NULL,
                "trazado" geometry(LineString, 4326),
                "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "uq_ruta_sentido" UNIQUE ("ruta_id", "sentido"),
                CONSTRAINT "PK_57b464f0e64144deff267a72a67" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE INDEX "IDX_382b52fdaaec36b09a7f1ecd89" ON "ruta_sentidos" USING gist ("trazado")
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."horarios_tipo_dia_enum" AS ENUM('laboral', 'sabado', 'domingo_festivo')
        `);
        await queryRunner.query(`
            CREATE TABLE "horarios" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "ruta_sentido_id" uuid NOT NULL,
                "tipo_dia" "public"."horarios_tipo_dia_enum" NOT NULL,
                "hora_salida" TIME NOT NULL,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "uq_horario" UNIQUE ("ruta_sentido_id", "tipo_dia", "hora_salida"),
                CONSTRAINT "PK_c69b602fc8441125f1310a4858d" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."reportes_tipo_enum" AS ENUM('ruta', 'embarcadero', 'horario', 'otro')
        `);
        await queryRunner.query(`
            CREATE TYPE "public"."reportes_estado_enum" AS ENUM(
                'pendiente',
                'en_revision',
                'resuelto',
                'descartado'
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "reportes" (
                "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
                "usuario_id" uuid,
                "ruta_id" uuid,
                "embarcadero_id" uuid,
                "tipo" "public"."reportes_tipo_enum" NOT NULL,
                "descripcion" text NOT NULL,
                "estado" "public"."reportes_estado_enum" NOT NULL DEFAULT 'pendiente',
                "respuesta_admin" text,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                "actualizado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_4204634633cb4099bc06b27a17e" PRIMARY KEY ("id")
            )
        `);
        await queryRunner.query(`
            CREATE TABLE "favoritos" (
                "usuario_id" uuid NOT NULL,
                "ruta_id" uuid NOT NULL,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_1df482314b24b69dfbc35308ee9" PRIMARY KEY ("usuario_id", "ruta_id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "auditoria"
            ADD CONSTRAINT "FK_e3351946be53c7cd3286ed4c49d" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ruta_embarcaderos"
            ADD CONSTRAINT "FK_606e9ff7ed8d8a570ef8081b407" FOREIGN KEY ("ruta_sentido_id") REFERENCES "ruta_sentidos"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ruta_embarcaderos"
            ADD CONSTRAINT "FK_1c5229c7e3fc9c23ed1b7768b54" FOREIGN KEY ("embarcadero_id") REFERENCES "embarcaderos"("id") ON DELETE RESTRICT ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "ruta_sentidos"
            ADD CONSTRAINT "FK_f7d859a1d63dd3daa86825250be" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "horarios"
            ADD CONSTRAINT "FK_e591f0107173fa73b5982e39953" FOREIGN KEY ("ruta_sentido_id") REFERENCES "ruta_sentidos"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "reportes"
            ADD CONSTRAINT "FK_5fd0f11ce1c9a42ebc8fb5b15d9" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "reportes"
            ADD CONSTRAINT "FK_65a980642fe0ac1e3ebaf7dd64c" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "reportes"
            ADD CONSTRAINT "FK_d98c376cf5c962e20d896cb7a33" FOREIGN KEY ("embarcadero_id") REFERENCES "embarcaderos"("id") ON DELETE
            SET NULL ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "favoritos"
            ADD CONSTRAINT "FK_a5437f5339df26be381a7df84b7" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "favoritos"
            ADD CONSTRAINT "FK_ebba21db36587754086b28ba37f" FOREIGN KEY ("ruta_id") REFERENCES "rutas"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "favoritos" DROP CONSTRAINT "FK_ebba21db36587754086b28ba37f"
        `);
        await queryRunner.query(`
            ALTER TABLE "favoritos" DROP CONSTRAINT "FK_a5437f5339df26be381a7df84b7"
        `);
        await queryRunner.query(`
            ALTER TABLE "reportes" DROP CONSTRAINT "FK_d98c376cf5c962e20d896cb7a33"
        `);
        await queryRunner.query(`
            ALTER TABLE "reportes" DROP CONSTRAINT "FK_65a980642fe0ac1e3ebaf7dd64c"
        `);
        await queryRunner.query(`
            ALTER TABLE "reportes" DROP CONSTRAINT "FK_5fd0f11ce1c9a42ebc8fb5b15d9"
        `);
        await queryRunner.query(`
            ALTER TABLE "horarios" DROP CONSTRAINT "FK_e591f0107173fa73b5982e39953"
        `);
        await queryRunner.query(`
            ALTER TABLE "ruta_sentidos" DROP CONSTRAINT "FK_f7d859a1d63dd3daa86825250be"
        `);
        await queryRunner.query(`
            ALTER TABLE "ruta_embarcaderos" DROP CONSTRAINT "FK_1c5229c7e3fc9c23ed1b7768b54"
        `);
        await queryRunner.query(`
            ALTER TABLE "ruta_embarcaderos" DROP CONSTRAINT "FK_606e9ff7ed8d8a570ef8081b407"
        `);
        await queryRunner.query(`
            ALTER TABLE "auditoria" DROP CONSTRAINT "FK_e3351946be53c7cd3286ed4c49d"
        `);
        await queryRunner.query(`
            DROP TABLE "favoritos"
        `);
        await queryRunner.query(`
            DROP TABLE "reportes"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reportes_estado_enum"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."reportes_tipo_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "horarios"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."horarios_tipo_dia_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_382b52fdaaec36b09a7f1ecd89"
        `);
        await queryRunner.query(`
            DROP TABLE "ruta_sentidos"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."ruta_sentidos_sentido_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "ruta_embarcaderos"
        `);
        await queryRunner.query(`
            DROP TABLE "rutas"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."rutas_estado_enum"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."IDX_7864d85bb0824d3fa861302838"
        `);
        await queryRunner.query(`
            DROP TABLE "embarcaderos"
        `);
        await queryRunner.query(`
            DROP TABLE "dias_festivos"
        `);
        await queryRunner.query(`
            DROP INDEX "public"."ix_auditoria_entidad"
        `);
        await queryRunner.query(`
            DROP TABLE "auditoria"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."auditoria_accion_enum"
        `);
        await queryRunner.query(`
            DROP TABLE "usuarios"
        `);
        await queryRunner.query(`
            DROP TYPE "public"."usuarios_rol_enum"
        `);
    }

}
