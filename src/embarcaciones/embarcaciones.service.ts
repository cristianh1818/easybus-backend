import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Embarcacion } from './entities/embarcacion.entity.js';
import {
  ActualizarEmbarcacionDto,
  CrearEmbarcacionDto,
  FiltroEmbarcacionesDto,
} from './dto/embarcacion.dto.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { AccionAuditoria } from '../common/enums.js';
import { instantanea } from '../common/utils/instantanea.js';

const ENTIDAD = 'embarcaciones';

@Injectable()
export class EmbarcacionesService {
  constructor(
    @InjectRepository(Embarcacion) private readonly repo: Repository<Embarcacion>,
    private readonly auditoria: AuditoriaService,
  ) {}

  listar(filtro: FiltroEmbarcacionesDto) {
    return this.repo.find({
      where: filtro.estado ? { estado: filtro.estado } : {},
      order: { codigo: 'ASC' },
    });
  }

  obtener(id: string) {
    return this.buscar(id);
  }

  async crear(dto: CrearEmbarcacionDto, usuarioId: string) {
    const codigo = dto.codigo.toUpperCase().trim();
    await this.verificarCodigoLibre(codigo);
    const guardada = await this.repo.save(
      this.repo.create({ ...dto, codigo, nombre: dto.nombre.trim() }),
    );
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: guardada.id,
      accion: AccionAuditoria.CREAR,
      datosNuevos: instantanea(guardada),
    });
    return this.buscar(guardada.id);
  }

  async actualizar(id: string, dto: ActualizarEmbarcacionDto, usuarioId: string) {
    const actual = await this.buscar(id);
    const previo = instantanea(actual);
    if (dto.codigo) {
      dto.codigo = dto.codigo.toUpperCase().trim();
      if (dto.codigo !== actual.codigo) await this.verificarCodigoLibre(dto.codigo);
    }
    Object.assign(actual, dto);
    const guardada = await this.repo.save(actual);
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: id,
      accion: AccionAuditoria.ACTUALIZAR,
      datosPrevios: previo,
      datosNuevos: instantanea(guardada),
    });
    return guardada;
  }

  async eliminar(id: string, usuarioId: string) {
    const actual = await this.buscar(id);
    await this.repo.delete(id);
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: id,
      accion: AccionAuditoria.ELIMINAR,
      datosPrevios: instantanea(actual),
    });
    return { eliminado: true, id };
  }

  private async buscar(id: string) {
    const e = await this.repo.findOneBy({ id });
    if (!e) throw new NotFoundException('Embarcación no encontrada');
    return e;
  }

  private async verificarCodigoLibre(codigo: string) {
    if (await this.repo.existsBy({ codigo })) {
      throw new ConflictException({
        code: 'CODIGO_DUPLICADO',
        message: `Ya existe una embarcación con el código ${codigo}`,
      });
    }
  }
}
