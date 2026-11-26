// Migración 5 (entrega final): tabla favoritos_embarcaderos (usuario, embarcadero).
// Solo crea objetos nuevos; no modifica datos existentes. Los favoritos de rutas
// siguen en la tabla "favoritos".

import { MigrationInterface, QueryRunner } from "typeorm";

export class FavoritosEmbarcaderos1794300000000 implements MigrationInterface {
    name = 'FavoritosEmbarcaderos1794300000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE "favoritos_embarcaderos" (
                "usuario_id" uuid NOT NULL,
                "embarcadero_id" uuid NOT NULL,
                "creado_en" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
                CONSTRAINT "PK_favoritos_embarcaderos" PRIMARY KEY ("usuario_id", "embarcadero_id")
            )
        `);
        await queryRunner.query(`
            ALTER TABLE "favoritos_embarcaderos"
            ADD CONSTRAINT "FK_favoritos_embarcaderos_usuario" FOREIGN KEY ("usuario_id") REFERENCES "usuarios"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
        await queryRunner.query(`
            ALTER TABLE "favoritos_embarcaderos"
            ADD CONSTRAINT "FK_favoritos_embarcaderos_embarcadero" FOREIGN KEY ("embarcadero_id") REFERENCES "embarcaderos"("id") ON DELETE CASCADE ON UPDATE NO ACTION
        `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "favoritos_embarcaderos" DROP CONSTRAINT "FK_favoritos_embarcaderos_embarcadero"
        `);
        await queryRunner.query(`
            ALTER TABLE "favoritos_embarcaderos" DROP CONSTRAINT "FK_favoritos_embarcaderos_usuario"
        `);
        await queryRunner.query(`
            DROP TABLE "favoritos_embarcaderos"
        `);
    }
}
