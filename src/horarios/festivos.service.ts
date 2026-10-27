import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Between, Repository } from 'typeorm';
import { DiaFestivo } from './entities/dia-festivo.entity.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { AccionAuditoria } from '../common/enums.js';
import { instantanea } from '../common/utils/instantanea.js';
import { CrearFestivoDto } from './dto/festivo.dto.js';

@Injectable()
export class FestivosService {
  constructor(
    @InjectRepository(DiaFestivo) private readonly repo: Repository<DiaFestivo>,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(anio?: number) {
    return this.repo.find({
      where: anio ? { fecha: Between(`${anio}-01-01`, `${anio}-12-31`) } : {},
      order: { fecha: 'ASC' },
    });
  }

  async crear(dto: CrearFestivoDto, usuarioId: string) {
    if (await this.repo.existsBy({ fecha: dto.fecha })) {
      throw new ConflictException(`Ya hay un festivo registrado el ${dto.fecha}`);
    }
    const festivo = await this.repo.save(this.repo.create(dto));
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'dias_festivos',
      entidadId: festivo.fecha,
      accion: AccionAuditoria.CREAR,
      datosNuevos: instantanea(festivo),
    });
    return festivo;
  }

  async eliminar(fecha: string, usuarioId: string) {
    const festivo = await this.repo.findOneBy({ fecha });
    if (!festivo) throw new NotFoundException('No hay festivo en esa fecha');
    await this.repo.delete({ fecha });
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'dias_festivos',
      entidadId: fecha,
      accion: AccionAuditoria.ELIMINAR,
      datosPrevios: instantanea(festivo),
    });
    return { eliminado: true, fecha };
  }

  // La usa el cálculo de la próxima salida
  esFestivo(fecha: string): Promise<boolean> {
    return this.repo.existsBy({ fecha });
  }
}
