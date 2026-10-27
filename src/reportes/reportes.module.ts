import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Reporte } from './entities/reporte.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { Embarcadero } from '../embarcaderos/entities/embarcadero.entity.js';
import { ReportesService } from './reportes.service.js';
import { ReportesController } from './reportes.controller.js';
import { AdminReportesController } from './admin-reportes.controller.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Reporte, Ruta, Embarcadero]), AuditoriaModule],
  controllers: [ReportesController, AdminReportesController],
  providers: [ReportesService],
  exports: [TypeOrmModule],
})
export class ReportesModule {}
