import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Horario } from '../horarios/entities/horario.entity.js';
import { RutasModule } from '../rutas/rutas.module.js';
import { HorariosModule } from '../horarios/horarios.module.js';
import { PublicoController } from './publico.controller.js';
import { ProximaSalidaService } from './proxima-salida.service.js';

// Consultas públicas para la app del pasajero
@Module({
  imports: [TypeOrmModule.forFeature([Horario]), RutasModule, HorariosModule],
  controllers: [PublicoController],
  providers: [ProximaSalidaService],
})
export class PublicoModule {}
