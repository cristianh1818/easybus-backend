import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Auditoria } from './entities/auditoria.entity.js';
import { AuditoriaService } from './auditoria.service.js';
import { AdminAuditoriaController } from './admin-auditoria.controller.js';

@Module({
  imports: [TypeOrmModule.forFeature([Auditoria])],
  controllers: [AdminAuditoriaController],
  providers: [AuditoriaService],
  exports: [AuditoriaService],
})
export class AuditoriaModule {}
