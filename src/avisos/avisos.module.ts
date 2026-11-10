import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AvisoServicio } from './entities/aviso-servicio.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { Embarcadero } from '../embarcaderos/entities/embarcadero.entity.js';
import { RutaEmbarcadero } from '../rutas/entities/ruta-embarcadero.entity.js';
import { AvisosService } from './avisos.service.js';
import { AdminAvisosController } from './admin-avisos.controller.js';
import { AvisosController } from './avisos.controller.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';

@Module({
  imports: [
    TypeOrmModule.forFeature([AvisoServicio, Ruta, Embarcadero, RutaEmbarcadero]),
    AuditoriaModule,
  ],
  controllers: [AdminAvisosController, AvisosController],
  providers: [AvisosService],
  // La próxima salida (paso 5) usará el servicio para detectar suspensiones
  exports: [AvisosService],
})
export class AvisosModule {}
