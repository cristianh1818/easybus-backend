import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { Horario } from './entities/horario.entity.js';
import { RutaSentido } from '../rutas/entities/ruta-sentido.entity.js';
import { RutasService } from '../rutas/rutas.service.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { AccionAuditoria, Sentido, TipoDia } from '../common/enums.js';
import { instantanea } from '../common/utils/instantanea.js';
import { ActualizarHorarioDto, CrearHorarioDto } from './dto/horario.dto.js';

// La BD guarda "06:30:00"; la API muestra "06:30"
export const formatoHora = (hora: string) => hora.slice(0, 5);

const formatear = (h: Horario) => ({
  id: h.id,
  tipoDia: h.tipoDia,
  horaSalida: formatoHora(h.horaSalida),
});

@Injectable()
export class HorariosService {
  constructor(
    @InjectRepository(Horario) private readonly repo: Repository<Horario>,
    private readonly rutas: RutasService,
    private readonly dataSource: DataSource,
    private readonly auditoria: AuditoriaService,
  ) {}

  async listar(rutaId: string, sentido: Sentido, tipoDia?: TipoDia) {
    const s = await this.rutas.obtenerSentido(rutaId, sentido);
    const lista = await this.repo.find({
      where: { rutaSentidoId: s.id, ...(tipoDia ? { tipoDia } : {}) },
      order: { tipoDia: 'ASC', horaSalida: 'ASC' },
    });
    return {
      rutaId,
      sentido,
      destino: s.destino,
      actualizadoEn: s.actualizadoEn,
      horarios: lista.map(formatear),
    };
  }

  async crear(rutaId: string, sentido: Sentido, dto: CrearHorarioDto, usuarioId: string) {
    const s = await this.rutas.obtenerSentido(rutaId, sentido);
    await this.verificarDuplicado(s.id, dto.tipoDia, dto.horaSalida);

    const horario = await this.repo.save(
      this.repo.create({ rutaSentidoId: s.id, tipoDia: dto.tipoDia, horaSalida: dto.horaSalida }),
    );
    await this.marcarSentidoActualizado(s.id);
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'horarios',
      entidadId: horario.id,
      accion: AccionAuditoria.CREAR,
      datosNuevos: instantanea(horario),
    });
    return formatear(horario);
  }

  // Reemplaza todas las horas de un sentido + tipo de día en una sola operación (carga masiva)
  async reemplazar(
    rutaId: string,
    sentido: Sentido,
    tipoDia: TipoDia,
    horas: string[],
    usuarioId: string,
  ) {
    const s = await this.rutas.obtenerSentido(rutaId, sentido);
    const ordenadas = [...horas].sort();

    await this.dataSource.transaction(async (manager) => {
      const repo = manager.getRepository(Horario);
      const anteriores = await repo.find({
        where: { rutaSentidoId: s.id, tipoDia },
        order: { horaSalida: 'ASC' },
      });
      await repo.delete({ rutaSentidoId: s.id, tipoDia });
      if (ordenadas.length > 0) {
        await repo.insert(
          ordenadas.map((horaSalida) => ({ rutaSentidoId: s.id, tipoDia, horaSalida })),
        );
      }
      await manager.update(RutaSentido, s.id, { actualizadoEn: new Date() });
      await this.auditoria.registrar(
        {
          usuarioId,
          entidad: 'horarios',
          entidadId: `${s.id}:${tipoDia}`,
          accion: AccionAuditoria.ACTUALIZAR,
          datosPrevios: { tipoDia, horas: anteriores.map((h) => formatoHora(h.horaSalida)) },
          datosNuevos: { tipoDia, horas: ordenadas },
        },
        manager,
      );
    });

    return this.listar(rutaId, sentido, tipoDia);
  }

  async actualizar(id: string, dto: ActualizarHorarioDto, usuarioId: string) {
    const horario = await this.buscar(id);
    const previo = instantanea(horario);
    const tipoDia = dto.tipoDia ?? horario.tipoDia;
    const horaSalida = dto.horaSalida ?? formatoHora(horario.horaSalida);
    if (tipoDia !== horario.tipoDia || horaSalida !== formatoHora(horario.horaSalida)) {
      await this.verificarDuplicado(horario.rutaSentidoId, tipoDia, horaSalida);
    }

    horario.tipoDia = tipoDia;
    horario.horaSalida = horaSalida;
    const guardado = await this.repo.save(horario);
    await this.marcarSentidoActualizado(horario.rutaSentidoId);
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'horarios',
      entidadId: id,
      accion: AccionAuditoria.ACTUALIZAR,
      datosPrevios: previo,
      datosNuevos: instantanea(guardado),
    });
    return formatear(guardado);
  }

  async eliminar(id: string, usuarioId: string) {
    const horario = await this.buscar(id);
    await this.repo.delete(id);
    await this.marcarSentidoActualizado(horario.rutaSentidoId);
    await this.auditoria.registrar({
      usuarioId,
      entidad: 'horarios',
      entidadId: id,
      accion: AccionAuditoria.ELIMINAR,
      datosPrevios: instantanea(horario),
    });
    return { eliminado: true, id };
  }

  private async buscar(id: string) {
    const h = await this.repo.findOneBy({ id });
    if (!h) throw new NotFoundException('Horario no encontrado');
    return h;
  }

  private async verificarDuplicado(rutaSentidoId: string, tipoDia: TipoDia, horaSalida: string) {
    if (await this.repo.existsBy({ rutaSentidoId, tipoDia, horaSalida })) {
      throw new ConflictException({
        code: 'HORARIO_DUPLICADO',
        message: `Ya existe la salida de las ${horaSalida} para ese tipo de día`,
      });
    }
  }

  // La fecha de última actualización del sentido se muestra al pasajero junto a los horarios
  private async marcarSentidoActualizado(rutaSentidoId: string) {
    await this.dataSource.getRepository(RutaSentido).update(rutaSentidoId, {
      actualizadoEn: new Date(),
    });
  }
}
