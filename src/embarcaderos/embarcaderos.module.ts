import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Embarcadero } from './entities/embarcadero.entity.js';
import { RutaEmbarcadero } from '../rutas/entities/ruta-embarcadero.entity.js';
import { EmbarcaderosService } from './embarcaderos.service.js';
import { AdminEmbarcaderosController } from './admin-embarcaderos.controller.js';
import { EmbarcaderosController } from './embarcaderos.controller.js';
import { EmbarcaderosPublicoService } from './embarcaderos-publico.service.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Embarcadero, RutaEmbarcadero]), AuditoriaModule],
  controllers: [AdminEmbarcaderosController, EmbarcaderosController],
  providers: [EmbarcaderosService, EmbarcaderosPublicoService],
  exports: [TypeOrmModule, EmbarcaderosService],
})
export class EmbarcaderosModule {}
