import { Module } from '@nestjs/common';
import { AdminResumenController } from './admin-resumen.controller.js';

// Funciones del panel que reúnen datos de varios módulos
@Module({
  controllers: [AdminResumenController],
})
export class AdminModule {}
