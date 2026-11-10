import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, SelectQueryBuilder } from 'typeorm';
import { AvisoServicio } from './entities/aviso-servicio.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { Embarcadero } from '../embarcaderos/entities/embarcadero.entity.js';
import { RutaEmbarcadero } from '../rutas/entities/ruta-embarcadero.entity.js';
import {
  ActualizarAvisoDto,
  CrearAvisoDto,
  FiltroAvisosAdminDto,
  FiltroAvisosPublicoDto,
} from './dto/aviso.dto.js';
import { formatearAviso } from './aviso.mapper.js';
import { puedeEliminarse, SQL_PRIORIDAD, vigencia } from './vigencia.js';
import { interpretarMomento } from '../publico/proxima-salida.util.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { AccionAuditoria, VigenciaAviso } from '../common/enums.js';
import { instantanea } from '../common/utils/instantanea.js';

const ENTIDAD = 'avisos_servicio';

// Condiciones de vigencia en SQL para los filtros del administrador (now() = reloj de PostgreSQL)
const SQL_VIGENCIA: Record<VigenciaAviso, string> = {
  [VigenciaAviso.VIGENTE]: 'a.vigente_desde <= now() AND (a.vigente_hasta IS NULL OR a.vigente_hasta > now())',
  [VigenciaAviso.PROGRAMADO]: 'a.vigente_desde > now()',
  [VigenciaAviso.VENCIDO]: 'a.vigente_hasta IS NOT NULL AND a.vigente_hasta <= now()',
};

// Rutas que pasan por un embarcadero / embarcaderos que tiene una ruta (en cualquier sentido)
const SQL_RUTAS_DEL_EMBARCADERO = `SELECT rs.ruta_id FROM ruta_embarcaderos re
  JOIN ruta_sentidos rs ON rs.id = re.ruta_sentido_id WHERE re.embarcadero_id = :embarcaderoId`;
const SQL_EMBARCADEROS_DE_LA_RUTA = `SELECT re.embarcadero_id FROM ruta_embarcaderos re
  JOIN ruta_sentidos rs ON rs.id = re.ruta_sentido_id WHERE rs.ruta_id = :rutaId`;

@Injectable()
export class AvisosService {
  constructor(
    @InjectRepository(AvisoServicio) private readonly repo: Repository<AvisoServicio>,
    @InjectRepository(Ruta) private readonly rutas: Repository<Ruta>,
    @InjectRepository(Embarcadero) private readonly embarcaderos: Repository<Embarcadero>,
    @InjectRepository(RutaEmbarcadero) private readonly asignaciones: Repository<RutaEmbarcadero>,
    private readonly auditoria: AuditoriaService,
  ) {}

  // ---------- Público ----------

  // Avisos vigentes en un momento (por defecto ahora), del más importante al menos importante.
  // Con rutaId / embarcaderoId devuelve solo los que afectan a esa ruta o embarcadero.
  async vigentes(filtro: FiltroAvisosPublicoDto = {}, ahora: Date = new Date()) {
    const qb = this.consulta().where(
      'a.vigente_desde <= :ahora AND (a.vigente_hasta IS NULL OR a.vigente_hasta > :ahora)',
      { ahora },
    );
    const { rutaId, embarcaderoId } = filtro;

    if (rutaId && embarcaderoId) {
      qb.andWhere(
        `((a.ruta_id IS NULL AND a.embarcadero_id IS NULL)
          OR (a.ruta_id = :rutaId AND (a.embarcadero_id IS NULL OR a.embarcadero_id = :embarcaderoId))
          OR (a.ruta_id IS NULL AND a.embarcadero_id = :embarcaderoId))`,
        { rutaId, embarcaderoId },
      );
    } else if (rutaId) {
      qb.andWhere(
        `((a.ruta_id IS NULL AND a.embarcadero_id IS NULL)
          OR a.ruta_id = :rutaId
          OR (a.ruta_id IS NULL AND a.embarcadero_id IN (${SQL_EMBARCADEROS_DE_LA_RUTA})))`,
        { rutaId },
      );
    } else if (embarcaderoId) {
      qb.andWhere(
        `((a.ruta_id IS NULL AND a.embarcadero_id IS NULL)
          OR a.embarcadero_id = :embarcaderoId
          OR (a.embarcadero_id IS NULL AND a.ruta_id IN (${SQL_RUTAS_DEL_EMBARCADERO})))`,
        { embarcaderoId },
      );
    }

    return (await qb.getMany()).map((a) => formatearAviso(a, ahora));
  }

  // ---------- Administración ----------

  async listar(filtro: FiltroAvisosAdminDto) {
    // offset/limit (no skip/take): los joins son de a lo sumo una fila, no hay duplicados
    const qb = this.consulta()
      .offset((filtro.pagina - 1) * filtro.limite)
      .limit(filtro.limite);
    if (filtro.vigencia) qb.andWhere(SQL_VIGENCIA[filtro.vigencia]);
    if (filtro.tipo) qb.andWhere('a.tipo = :tipo', { tipo: filtro.tipo });

    const [datos, total] = await qb.getManyAndCount();
    const ahora = new Date();
    return { total, pagina: filtro.pagina, limite: filtro.limite, datos: datos.map((a) => formatearAviso(a, ahora)) };
  }

  async obtener(id: string) {
    const a = await this.consulta().where('a.id = :id', { id }).getOne();
    if (!a) throw new NotFoundException('Aviso no encontrado');
    return formatearAviso(a);
  }

  async crear(dto: CrearAvisoDto, usuarioId: string) {
    const rutaId = dto.rutaId ?? null;
    const embarcaderoId = dto.embarcaderoId ?? null;
    const desde = dto.vigenteDesde ? interpretarMomento(dto.vigenteDesde) : new Date();
    const hasta = dto.vigenteHasta ? interpretarMomento(dto.vigenteHasta) : null;
    await this.validarAlcance(rutaId, embarcaderoId);
    this.validarFechas(desde, hasta);

    const guardado = await this.repo.save(
      this.repo.create({
        tipo: dto.tipo,
        motivo: dto.motivo,
        titulo: dto.titulo.trim(),
        mensaje: dto.mensaje.trim(),
        rutaId,
        embarcaderoId,
        vigenteDesde: desde,
        vigenteHasta: hasta,
        creadoPor: usuarioId,
      }),
    );
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: guardado.id,
      accion: AccionAuditoria.CREAR,
      datosNuevos: instantanea(await this.buscar(guardado.id)),
    });
    return this.obtener(guardado.id);
  }

  async actualizar(id: string, dto: ActualizarAvisoDto, usuarioId: string) {
    const aviso = await this.buscar(id);
    const previo = instantanea(aviso);

    if (dto.tipo !== undefined) aviso.tipo = dto.tipo;
    if (dto.motivo !== undefined) aviso.motivo = dto.motivo;
    if (dto.titulo !== undefined) aviso.titulo = dto.titulo.trim();
    if (dto.mensaje !== undefined) aviso.mensaje = dto.mensaje.trim();
    if (dto.rutaId !== undefined) aviso.rutaId = dto.rutaId;
    if (dto.embarcaderoId !== undefined) aviso.embarcaderoId = dto.embarcaderoId;
    if (dto.vigenteDesde !== undefined) aviso.vigenteDesde = interpretarMomento(dto.vigenteDesde);
    if (dto.vigenteHasta !== undefined) {
      aviso.vigenteHasta = dto.vigenteHasta ? interpretarMomento(dto.vigenteHasta) : null;
    }
    await this.validarAlcance(aviso.rutaId, aviso.embarcaderoId);
    this.validarFechas(aviso.vigenteDesde, aviso.vigenteHasta);

    // Sin las relaciones cargadas, para que se guarden los ids nuevos
    await this.repo.save(this.repo.create({ ...aviso, ruta: undefined, embarcadero: undefined }));
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: id,
      accion: AccionAuditoria.ACTUALIZAR,
      datosPrevios: previo,
      datosNuevos: instantanea(await this.buscar(id)),
    });
    return this.obtener(id);
  }

  // Termina un aviso vigente en este momento (queda en el historial como vencido)
  async cerrar(id: string, usuarioId: string) {
    const aviso = await this.buscar(id);
    const estado = vigencia(aviso.vigenteDesde, aviso.vigenteHasta);
    if (estado === VigenciaAviso.VENCIDO) {
      throw new ConflictException({ code: 'AVISO_VENCIDO', message: 'El aviso ya está vencido' });
    }
    if (estado === VigenciaAviso.PROGRAMADO) {
      throw new ConflictException({
        code: 'AVISO_NO_INICIADO',
        message: 'El aviso aún no ha empezado: edita sus fechas o elimínalo',
      });
    }
    const previo = instantanea(aviso);
    await this.repo.update(id, { vigenteHasta: new Date() });
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: id,
      accion: AccionAuditoria.ACTUALIZAR,
      datosPrevios: previo,
      datosNuevos: instantanea(await this.buscar(id)),
    });
    return this.obtener(id);
  }

  // Solo avisos programados (nunca vigentes). Los que ya estuvieron vigentes se cierran,
  // para no perder el historial de lo que se comunicó a los pasajeros.
  async eliminar(id: string, usuarioId: string) {
    const aviso = await this.buscar(id);
    const estado = vigencia(aviso.vigenteDesde, aviso.vigenteHasta);
    if (!puedeEliminarse(estado)) {
      throw new ConflictException({
        code: 'AVISO_NO_ELIMINABLE',
        message:
          estado === VigenciaAviso.VIGENTE
            ? 'El aviso está vigente: ciérralo (POST /admin/avisos/{id}/cerrar) para conservar el historial'
            : 'El aviso ya estuvo vigente y es parte del historial: no se puede eliminar',
      });
    }
    await this.repo.delete(id);
    await this.auditoria.registrar({
      usuarioId,
      entidad: ENTIDAD,
      entidadId: id,
      accion: AccionAuditoria.ELIMINAR,
      datosPrevios: instantanea(aviso),
    });
    return { eliminado: true, id };
  }

  // ---------- Utilidades ----------

  // Aviso con su ruta y embarcadero (solo los datos necesarios), ordenados por prioridad
  private consulta(): SelectQueryBuilder<AvisoServicio> {
    return this.repo
      .createQueryBuilder('a')
      .leftJoin('a.ruta', 'r')
      .addSelect(['r.id', 'r.codigo', 'r.nombre'])
      .leftJoin('a.embarcadero', 'e')
      .addSelect(['e.id', 'e.nombre'])
      .addSelect(SQL_PRIORIDAD, 'prioridad')
      .orderBy('prioridad', 'ASC')
      .addOrderBy('a.vigenteDesde', 'DESC');
  }

  private async buscar(id: string): Promise<AvisoServicio> {
    const a = await this.repo.findOneBy({ id });
    if (!a) throw new NotFoundException('Aviso no encontrado');
    return a;
  }

  private async validarAlcance(rutaId: string | null, embarcaderoId: string | null) {
    if (rutaId && !(await this.rutas.existsBy({ id: rutaId }))) {
      throw new BadRequestException('La ruta indicada no existe');
    }
    if (embarcaderoId && !(await this.embarcaderos.existsBy({ id: embarcaderoId }))) {
      throw new BadRequestException('El embarcadero indicado no existe');
    }
    if (rutaId && embarcaderoId) {
      const enRuta = await this.asignaciones.exists({
        where: { embarcaderoId, rutaSentido: { rutaId } },
      });
      if (!enRuta) throw new BadRequestException('Ese embarcadero no está en ningún sentido de esa ruta');
    }
  }

  private validarFechas(desde: Date, hasta: Date | null) {
    if (Number.isNaN(desde.getTime()) || (hasta && Number.isNaN(hasta.getTime()))) {
      throw new BadRequestException('Fecha inválida');
    }
    if (hasta && hasta <= desde) {
      throw new BadRequestException('vigenteHasta debe ser posterior a vigenteDesde');
    }
  }
}
