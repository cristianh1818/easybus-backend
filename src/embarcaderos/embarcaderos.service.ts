import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Point } from 'typeorm';
import { Embarcadero } from './entities/embarcadero.entity.js';
import { RutaEmbarcadero } from '../rutas/entities/ruta-embarcadero.entity.js';
import { CrearEmbarcaderoDto } from './dto/crear-embarcadero.dto.js';
import { ActualizarEmbarcaderoDto } from './dto/actualizar-embarcadero.dto.js';
import { FiltroEmbarcaderosDto } from './dto/filtro-embarcaderos.dto.js';
import { formatearEmbarcadero } from './embarcadero.mapper.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { AccionAuditoria } from '../common/enums.js';
import { instantanea } from '../common/utils/instantanea.js';

const ENTIDAD = 'embarcaderos';

// GeoJSON usa el orden [longitud, latitud]
const punto = (latitud: number, longitud: number): Point => ({
  type: 'Point',
  coordinates: [longitud, latitud],
});

@Injectable()
export class EmbarcaderosService {
  constructor(
    @InjectRepository(Embarcadero) private readonly repo: Repository<Embarcadero>,
    @InjectRepository(RutaEmbarcadero)
    private readonly asignaciones: Repository<RutaEmbarcadero>,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(filtro: FiltroEmbarcaderosDto) {
    const lista = await this.repo.find({
      where: filtro.estado ? { estado: filtro.estado } : {},
      order: { nombre: 'ASC' },
    });
    return lista.map(formatearEmbarcadero);
  }

  async obtener(id: string) {
    return formatearEmbarcadero(await this.buscar(id));
  }

  async crear(dto: CrearEmbarcaderoDto, usuarioId: string) {
    const { latitud, longitud, ...resto } = dto;
    const guardado = await this.repo.save(
      this.repo.create({ ...resto, ubicacion: punto(latitud, longitud) }),
    );
    const creado = await this.buscar(guardado.id);
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: creado.id,
      accion: AccionAuditoria.CREAR,
      datosNuevos: instantanea(creado),
    });
    return formatearEmbarcadero(creado);
  }

  async actualizar(id: string, dto: ActualizarEmbarcaderoDto, usuarioId: string) {
    const actual = await this.buscar(id);
    const previo = instantanea(actual);
    const { latitud, longitud, ...resto } = dto;

    Object.assign(actual, resto);
    if (latitud !== undefined || longitud !== undefined) {
      const [lngActual, latActual] = actual.ubicacion.coordinates;
      actual.ubicacion = punto(latitud ?? latActual, longitud ?? lngActual);
    }
    await this.repo.save(actual);

    const actualizado = await this.buscar(id);
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: id,
      accion: AccionAuditoria.ACTUALIZAR,
      datosPrevios: previo,
      datosNuevos: instantanea(actualizado),
    });
    return formatearEmbarcadero(actualizado);
  }

  async eliminar(id: string, usuarioId: string) {
    const actual = await this.buscar(id);
    const usos = await this.asignaciones.countBy({ embarcaderoId: id });
    if (usos > 0) {
      throw new ConflictException(
        `El embarcadero está asignado a ${usos} sentido(s) de ruta. ` +
          'Quítelo de esas secuencias o cambie su estado a "inactivo".',
      );
    }
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

  private async buscar(id: string): Promise<Embarcadero> {
    const e = await this.repo.findOneBy({ id });
    if (!e) throw new NotFoundException('Embarcadero no encontrado');
    return e;
  }
}
