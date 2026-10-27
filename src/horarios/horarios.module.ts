import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Horario } from './entities/horario.entity.js';
import { DiaFestivo } from './entities/dia-festivo.entity.js';
import { HorariosService } from './horarios.service.js';
import { FestivosService } from './festivos.service.js';
import { AdminHorariosController } from './admin-horarios.controller.js';
import { AdminFestivosController } from './admin-festivos.controller.js';
import { RutasModule } from '../rutas/rutas.module.js';
import { AuditoriaModule } from '../auditoria/auditoria.module.js';

@Module({
  imports: [TypeOrmModule.forFeature([Horario, DiaFestivo]), RutasModule, AuditoriaModule],
  controllers: [AdminHorariosController, AdminFestivosController],
  providers: [HorariosService, FestivosService],
  exports: [TypeOrmModule, HorariosService, FestivosService],
})
export class HorariosModule {}
