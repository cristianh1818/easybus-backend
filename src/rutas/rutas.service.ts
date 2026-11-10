import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, In, Repository } from 'typeorm';
import type { LineString } from 'typeorm';
import { Ruta } from './entities/ruta.entity.js';
import { RutaSentido } from './entities/ruta-sentido.entity.js';
import { RutaEmbarcadero } from './entities/ruta-embarcadero.entity.js';
import { Embarcadero } from '../embarcaderos/entities/embarcadero.entity.js';
import { CrearRutaDto } from './dto/crear-ruta.dto.js';
import { ActualizarRutaDto } from './dto/actualizar-ruta.dto.js';
import { FiltroRutasDto } from './dto/filtro-rutas.dto.js';
import { GuardarSentidoDto } from './dto/guardar-sentido.dto.js';
import { TrazadoDto } from './dto/trazado.dto.js';
import { formatearRutaDetalle, formatearRutaResumen, formatearSentido } from './ruta.mapper.js';
import { ActualizarTiempoDto } from './dto/actualizar-tiempo.dto.js';
import { distanciasAlTrazado, recalcularTiemposEstimados } from './tiempos-estimados.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { AccionAuditoria, EstadoEmbarcadero, Sentido } from '../common/enums.js';
import { instantanea } from '../common/utils/instantanea.js';

// Lo que se guarda en la auditoría de cada posición de la secuencia
const resumenTiempo = (f: RutaEmbarcadero) => ({
  embarcaderoId: f.embarcaderoId,
  orden: f.orden,
  minutosDesdeOrigen: f.minutosDesdeOrigen,
  tiempoEstimado: f.tiempoEstimado,
});

@Injectable()
export class RutasService {
  constructor(
    @InjectRepository(Ruta) private readonly rutas: Repository<Ruta>,
    @InjectRepository(RutaSentido) private readonly sentidos: Repository<RutaSentido>,
    @InjectRepository(Embarcadero) private readonly embarcaderos: Repository<Embarcadero>,
    private readonly dataSource: DataSource,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Rutas ----------

  async listar(filtro: FiltroRutasDto) {
    const lista = await this.rutas.find({
      where: filtro.estado ? { estado: filtro.estado } : {},
      relations: { sentidos: true },
      order: { codigo: 'ASC', sentidos: { sentido: 'ASC' } },
    });
    return lista.map(formatearRutaResumen);
  }

  async obtenerDetalle(id: string) {
    const ruta = await this.rutas.findOne({
      where: { id },
      relations: { sentidos: { embarcaderos: { embarcadero: true } } },
      order: { sentidos: { sentido: 'ASC', embarcaderos: { orden: 'ASC' } } },
    });
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
    const distancias = await distanciasAlTrazado(
      this.dataSource.manager,
      ruta.sentidos.map((s) => s.id),
    );
    return formatearRutaDetalle(ruta, distancias);
  }

  async crear(dto: CrearRutaDto, usuarioId: string) {
    const codigo = dto.codigo.toUpperCase();
    if (await this.rutas.existsBy({ codigo })) {
      throw new ConflictException({ code: 'CODIGO_DUPLICADO', message: `Ya existe una ruta con el código ${codigo}` });
    }
    const ruta = await this.rutas.save(this.rutas.create({ ...dto, codigo }));
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'rutas',
      entidadId: ruta.id,
      accion: AccionAuditoria.CREAR,
      datosNuevos: instantanea(ruta),
    });
    return this.obtenerDetalle(ruta.id);
  }

  async actualizar(id: string, dto: ActualizarRutaDto, usuarioId: string) {
    const ruta = await this.buscarRuta(id);
    const previo = instantanea(ruta);

    if (dto.codigo) {
      dto.codigo = dto.codigo.toUpperCase();
      if (dto.codigo !== ruta.codigo && (await this.rutas.existsBy({ codigo: dto.codigo }))) {
        throw new ConflictException({
          code: 'CODIGO_DUPLICADO',
          message: `Ya existe una ruta con el código ${dto.codigo}`,
        });
      }
    }
    Object.assign(ruta, dto);
    const guardada = await this.rutas.save(ruta);

    await this.auditoria.registrar({
      usuarioId,
      entidad: 'rutas',
      entidadId: id,
      accion: AccionAuditoria.ACTUALIZAR,
      datosPrevios: previo,
      datosNuevos: instantanea(guardada),
    });
    return this.obtenerDetalle(id);
  }

  // Borra la ruta y, en cascada, sus sentidos, secuencias y horarios
  async eliminar(id: string, usuarioId: string) {
    const ruta = await this.buscarRuta(id);
    await this.rutas.delete(id);
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'rutas',
      entidadId: id,
      accion: AccionAuditoria.ELIMINAR,
      datosPrevios: instantanea(ruta),
    });
    return { eliminado: true, id };
  }

  // ---------- Sentidos (ida / vuelta) ----------

  // Crea el sentido si no existe o actualiza su destino (y trazado si se envía)
  async guardarSentido(rutaId: string, sentido: Sentido, dto: GuardarSentidoDto, usuarioId: string) {
    await this.buscarRuta(rutaId);
    const existente = await this.sentidos.findOneBy({ rutaId, sentido });
    const previo = existente ? instantanea(existente) : null;

    const registro = existente ?? this.sentidos.create({ rutaId, sentido });
    registro.destino = dto.destino;
    if (dto.trazado) registro.trazado = this.aLineString(dto.trazado);
    const guardado = await this.sentidos.save(registro);
    if (dto.trazado) await recalcularTiemposEstimados(this.dataSource.manager, guardado.id);

    await this.auditoria.registrar({
      usuarioId,
      entidad: 'ruta_sentidos',
      entidadId: guardado.id,
      accion: existente ? AccionAuditoria.ACTUALIZAR : AccionAuditoria.CREAR,
      datosPrevios: previo,
      datosNuevos: instantanea(guardado),
    });
    return this.obtenerSentidoDetalle(guardado.id);
  }

  // Registra o reemplaza la línea geográfica del recorrido (RF-17)
  async actualizarTrazado(rutaId: string, sentido: Sentido, trazado: TrazadoDto, usuarioId: string) {
    const registro = await this.obtenerSentido(rutaId, sentido);
    const previo = instantanea(registro);
    registro.trazado = this.aLineString(trazado);
    const guardado = await this.sentidos.save(registro);
    // Con un trazado nuevo cambian las distancias: se recalculan los tiempos estimados
    await recalcularTiemposEstimados(this.dataSource.manager, registro.id);

    await this.auditoria.registrar({
      usuarioId,
      entidad: 'ruta_sentidos',
      entidadId: registro.id,
      accion: AccionAuditoria.ACTUALIZAR,
      datosPrevios: { trazado: previo.trazado },
      datosNuevos: { trazado: guardado.trazado },
    });
    return this.obtenerSentidoDetalle(registro.id);
  }

  async eliminarSentido(rutaId: string, sentido: Sentido, usuarioId: string) {
    const registro = await this.obtenerSentido(rutaId, sentido);
    await this.sentidos.delete(registro.id);
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'ruta_sentidos',
      entidadId: registro.id,
      accion: AccionAuditoria.ELIMINAR,
      datosPrevios: instantanea(registro),
    });
    return { eliminado: true, id: registro.id };
  }

  // ---------- Secuencia de embarcaderos ----------

  // Reemplaza la secuencia completa de un sentido. El orden es la posición en la lista.
  // Se hace en una transacción: si algo falla, queda la secuencia anterior intacta.
  async asignarEmbarcaderos(
    rutaId: string,
    sentido: Sentido,
    embarcaderoIds: string[],
    usuarioId: string,
  ) {
    const registro = await this.obtenerSentido(rutaId, sentido);

    if (embarcaderoIds.length > 0) {
      const encontrados = await this.embarcaderos.findBy({ id: In(embarcaderoIds) });
      const faltantes = embarcaderoIds.filter((id) => !encontrados.some((e) => e.id === id));
      if (faltantes.length > 0) {
        throw new BadRequestException(`Embarcaderos no encontrados: ${faltantes.join(', ')}`);
      }
      // Un embarcadero cerrado temporalmente sigue en la ruta; uno dado de baja no
      const inactivos = encontrados
        .filter((e) => e.estado === EstadoEmbarcadero.INACTIVO)
        .map((e) => e.nombre);
      if (inactivos.length > 0) {
        throw new BadRequestException(`Embarcaderos inactivos: ${inactivos.join(', ')}`);
      }
    }

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RutaEmbarcadero);
      const anteriores = await repo.find({
        where: { rutaSentidoId: registro.id },
        order: { orden: 'ASC' },
      });
      // Los tiempos reales (no estimados) se conservan para los embarcaderos que siguen en la secuencia
      const reales = new Map(
        anteriores.filter((a) => !a.tiempoEstimado).map((a) => [a.embarcaderoId, a.minutosDesdeOrigen]),
      );

      await repo.delete({ rutaSentidoId: registro.id });
      if (embarcaderoIds.length > 0) {
        await repo.insert(
          embarcaderoIds.map((embarcaderoId, i) => ({
            rutaSentidoId: registro.id,
            embarcaderoId,
            orden: i + 1,
            minutosDesdeOrigen: reales.get(embarcaderoId) ?? 0,
            tiempoEstimado: !reales.has(embarcaderoId),
          })),
        );
      }
      await recalcularTiemposEstimados(manager, registro.id);
      await manager.update(RutaSentido, registro.id, { actualizadoEn: new Date() });

      await this.auditoria.registrar(
        {
          usuarioId,
          entidad: 'ruta_embarcaderos',
          entidadId: registro.id,
          accion: AccionAuditoria.ACTUALIZAR,
          datosPrevios: { secuencia: anteriores.map(resumenTiempo) },
          datosNuevos: {
            secuencia: (await repo.find({ where: { rutaSentidoId: registro.id }, order: { orden: 'ASC' } })).map(
              resumenTiempo,
            ),
          },
        },
        manager,
      );
    });

    return this.obtenerSentidoDetalle(registro.id);
  }

  // ---------- Tiempos desde el origen ----------

  // Edita los minutos de un embarcadero de la secuencia y si son estimados o reales
  async actualizarTiempo(
    rutaId: string,
    sentido: Sentido,
    embarcaderoId: string,
    dto: ActualizarTiempoDto,
    usuarioId: string,
  ) {
    const registro = await this.obtenerSentido(rutaId, sentido);

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RutaEmbarcadero);
      const fila = await repo.findOneBy({ rutaSentidoId: registro.id, embarcaderoId });
      if (!fila) throw new NotFoundException('Ese embarcadero no está en la secuencia de este sentido');
      if (fila.orden === 1 && dto.minutosDesdeOrigen !== undefined && dto.minutosDesdeOrigen !== 0) {
        throw new BadRequestException('El primer embarcadero es el origen: sus minutos siempre son 0');
      }
      const previo = resumenTiempo(fila);

      if (dto.minutosDesdeOrigen !== undefined) fila.minutosDesdeOrigen = dto.minutosDesdeOrigen;
      // Escribir un valor a mano sin indicar el tipo lo convierte en tiempo real
      fila.tiempoEstimado = dto.tiempoEstimado ?? (dto.minutosDesdeOrigen !== undefined ? false : fila.tiempoEstimado);
      await repo.save(fila);
      await recalcularTiemposEstimados(manager, registro.id);
      await manager.update(RutaSentido, registro.id, { actualizadoEn: new Date() });

      const nuevo = await repo.findOneByOrFail({ rutaSentidoId: registro.id, embarcaderoId });
      await this.auditoria.registrar(
        {
          usuarioId,
          entidad: 'ruta_embarcaderos',
          entidadId: `${registro.id}:${embarcaderoId}`,
          accion: AccionAuditoria.ACTUALIZAR,
          datosPrevios: previo,
          datosNuevos: resumenTiempo(nuevo),
        },
        manager,
      );
    });

    return this.obtenerSentidoDetalle(registro.id);
  }

  // Vuelve a calcular los tiempos estimados (los reales no se tocan)
  async recalcularTiempos(rutaId: string, sentido: Sentido, usuarioId: string) {
    const registro = await this.obtenerSentido(rutaId, sentido);
    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(RutaEmbarcadero);
      const orden = { where: { rutaSentidoId: registro.id }, order: { orden: 'ASC' as const } };
      const antes = (await repo.find(orden)).map(resumenTiempo);
      const cambios = await recalcularTiemposEstimados(manager, registro.id);
      if (cambios === 0) return;
      await manager.update(RutaSentido, registro.id, { actualizadoEn: new Date() });
      await this.auditoria.registrar(
        {
          usuarioId,
          entidad: 'ruta_embarcaderos',
          entidadId: registro.id,
          accion: AccionAuditoria.ACTUALIZAR,
          datosPrevios: { secuencia: antes },
          datosNuevos: { secuencia: (await repo.find(orden)).map(resumenTiempo) },
        },
        manager,
      );
    });
    return this.obtenerSentidoDetalle(registro.id);
  }

  // ---------- Utilidades (también las usan otros módulos) ----------

  async obtenerSentido(rutaId: string, sentido: Sentido): Promise<RutaSentido> {
    await this.buscarRuta(rutaId);
    const registro = await this.sentidos.findOneBy({ rutaId, sentido });
    if (!registro) {
      throw new NotFoundException(
        `La ruta no tiene configurado el sentido "${sentido}". Créelo primero con PUT .../sentidos/${sentido}`,
      );
    }
    return registro;
  }

  async buscarRuta(id: string): Promise<Ruta> {
    const ruta = await this.rutas.findOneBy({ id });
    if (!ruta) throw new NotFoundException('Ruta no encontrada');
    return ruta;
  }

  private async obtenerSentidoDetalle(id: string) {
    const s = await this.sentidos.findOne({
      where: { id },
      relations: { embarcaderos: { embarcadero: true } },
      order: { embarcaderos: { orden: 'ASC' } },
    });
    const distancias = await distanciasAlTrazado(this.dataSource.manager, [id]);
    return formatearSentido(s!, distancias);
  }

  private aLineString(trazado: TrazadoDto): LineString {
    return { type: 'LineString', coordinates: trazado.coordinates };
  }
}
