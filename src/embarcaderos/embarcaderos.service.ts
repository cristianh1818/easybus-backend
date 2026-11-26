import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
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
import { borrarSubido, esRutaLocal, guardarWebp } from '../common/archivos/uploads.js';
import { procesarFoto } from './fotos/procesar-foto.js';

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
    // Si se cambió o quitó una foto subida, se borra el archivo anterior
    if (previo.fotoUrl !== actualizado.fotoUrl) await this.borrarFotoSinUso(previo.fotoUrl as string | null);
    return formatearEmbarcadero(actualizado);
  }

  // Sube (o reemplaza) la foto: valida, redimensiona, convierte a WEBP sin EXIF,
  // la guarda con nombre aleatorio y borra la anterior. Queda en la auditoría.
  async subirFoto(id: string, datos: Buffer | undefined, usuarioId: string) {
    if (!datos?.length) {
      throw new BadRequestException({
        code: 'FOTO_REQUERIDA',
        message: 'Adjunta la foto en el campo "foto" (multipart/form-data)',
      });
    }
    const actual = await this.buscar(id);
    const webp = await procesarFoto(datos);
    const ruta = await guardarWebp(webp);
    try {
      return await this.cambiarFoto(actual, ruta, usuarioId);
    } catch (error) {
      await borrarSubido(ruta); // no dejar archivos huérfanos si falla la base
      throw error;
    }
  }

  async quitarFoto(id: string, usuarioId: string) {
    const actual = await this.buscar(id);
    if (!actual.fotoUrl) return formatearEmbarcadero(actual);
    return this.cambiarFoto(actual, null, usuarioId);
  }

  private async cambiarFoto(actual: Embarcadero, fotoUrl: string | null, usuarioId: string) {
    const previo = instantanea(actual);
    await this.repo.update(actual.id, { fotoUrl });
    const actualizado = await this.buscar(actual.id);
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: actual.id,
      accion: AccionAuditoria.ACTUALIZAR,
      datosPrevios: previo,
      datosNuevos: instantanea(actualizado),
    });
    await this.borrarFotoSinUso(actual.fotoUrl);
    return formatearEmbarcadero(actualizado);
  }

  // Borra el archivo de una foto subida, salvo que otro embarcadero todavía la use
  private async borrarFotoSinUso(ruta: string | null) {
    if (!esRutaLocal(ruta)) return;
    if ((await this.repo.countBy({ fotoUrl: ruta })) === 0) await borrarSubido(ruta);
  }

  async eliminar(id: string, usuarioId: string) {
    const actual = await this.buscar(id);
    const usos = await this.asignaciones.countBy({ embarcaderoId: id });
    if (usos > 0) {
      throw new ConflictException({
        code: 'EMBARCADERO_EN_USO',
        message:
          `El embarcadero está asignado a ${usos} sentido(s) de ruta. ` +
          'Quítelo de esas secuencias o cambie su estado a "inactivo".',
      });
    }
    await this.repo.delete(id);
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: id,
      accion: AccionAuditoria.ELIMINAR,
      datosPrevios: instantanea(actual),
    });
    await this.borrarFotoSinUso(actual.fotoUrl);
    return { eliminado: true, id };
  }

  private async buscar(id: string): Promise<Embarcadero> {
    const e = await this.repo.findOneBy({ id });
    if (!e) throw new NotFoundException('Embarcadero no encontrado');
    return e;
  }
}
