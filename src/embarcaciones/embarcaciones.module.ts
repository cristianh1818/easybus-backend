import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Embarcacion } from './entities/embarcacion.entity.js';
import { EmbarcacionesService } from './embarcaciones.service.js';
import { AdminEmbarcacionesController } from './admin-embarcaciones.controller.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Embarcacion]), AuditoriaModule],
  controllers: [AdminEmbarcacionesController],
  providers: [EmbarcacionesService],
  exports: [EmbarcacionesService],
})
export class EmbarcacionesModule {}
