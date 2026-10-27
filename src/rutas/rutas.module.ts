import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Ruta } from './entities/ruta.entity.js';
import { RutaSentido } from './entities/ruta-sentido.entity.js';
import { RutaEmbarcadero } from './entities/ruta-embarcadero.entity.js';
import { Embarcadero } from '../embarcaderos/entities/embarcadero.entity.js';
import { RutasService } from './rutas.service.js';
import { AdminRutasController } from './admin-rutas.controller.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([Ruta, RutaSentido, RutaEmbarcadero, Embarcadero]),
    AuditoriaModule,
  ],
  controllers: [AdminRutasController],
  providers: [RutasService],
  exports: [TypeOrmModule, RutasService],
})
export class RutasModule {}
