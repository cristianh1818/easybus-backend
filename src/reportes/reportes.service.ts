import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Reporte } from './entities/reporte.entity.js';
import { Ruta } from '../rutas/entities/ruta.entity.js';
import { Embarcadero } from '../embarcaderos/entities/embarcadero.entity.js';
import { AuditoriaService } from '../auditoria/auditoria.service.js';
import { AccionAuditoria } from '../common/enums.js';
import { instantanea } from '../common/utils/instantanea.js';
import { CrearReporteDto, FiltroReportesDto, GestionarReporteDto } from './dto/reporte.dto.js';

@Injectable()
export class ReportesService {
  constructor(
    @InjectRepository(Reporte) private readonly repo: Repository<Reporte>,
    @InjectRepository(Ruta) private readonly rutas: Repository<Ruta>,
    @InjectRepository(Embarcadero) private readonly embarcaderos: Repository<Embarcadero>,
    private readonly auditoria: AuditoriaService,
  ) {}

  // Público: cualquier persona puede reportar, con o sin cuenta (RF-12)
  async crear(dto: CrearReporteDto, usuarioId: string | null) {
    if (dto.rutaId && !(await this.rutas.existsBy({ id: dto.rutaId }))) {
      throw new BadRequestException('La ruta indicada no existe');
    }
    if (dto.embarcaderoId && !(await this.embarcaderos.existsBy({ id: dto.embarcaderoId }))) {
      throw new BadRequestException('El embarcadero indicado no existe');
    }
    const reporte = await this.repo.save(
      this.repo.create({
        tipo: dto.tipo,
        descripcion: dto.descripcion.trim(),
        rutaId: dto.rutaId ?? null,
        embarcaderoId: dto.embarcaderoId ?? null,
        usuarioId,
      }),
    );
    return {
      id: reporte.id,
      estado: reporte.estado,
      creadoEn: reporte.creadoEn,
      mensaje: 'Gracias. Tu reporte fue recibido y será revisado por el equipo de EASYBUS.',
    };
  }

  async listar(filtro: FiltroReportesDto) {
    const qb = this.consultaConRelaciones()
      .orderBy('r.creadoEn', 'DESC')
      .skip((filtro.pagina - 1) * filtro.limite)
      .take(filtro.limite);
    if (filtro.estado) qb.andWhere('r.estado = :estado', { estado: filtro.estado });
    if (filtro.tipo) qb.andWhere('r.tipo = :tipo', { tipo: filtro.tipo });

    const [datos, total] = await qb.getManyAndCount();
    return { total, pagina: filtro.pagina, limite: filtro.limite, datos };
  }

  async obtener(id: string) {
    const reporte = await this.consultaConRelaciones().where('r.id = :id', { id }).getOne();
    if (!reporte) throw new NotFoundException('Reporte no encontrado');
    return reporte;
  }

  // Admin: cambia el estado (pendiente -> en_revision -> resuelto / descartado) (RF-20)
  async gestionar(id: string, dto: GestionarReporteDto, usuarioId: string) {
    const reporte = await this.repo.findOneBy({ id });
    if (!reporte) throw new NotFoundException('Reporte no encontrado');
    const previo = instantanea(reporte);

    reporte.estado = dto.estado;
    if (dto.respuestaAdmin !== undefined) reporte.respuestaAdmin = dto.respuestaAdmin;
    const guardado = await this.repo.save(reporte);

    await this.auditoria.registrar({
      usuarioId,
      entidad: 'reportes',
      entidadId: id,
      accion: AccionAuditoria.ACTUALIZAR,
      datosPrevios: { estado: previo.estado, respuestaAdmin: previo.respuestaAdmin },
      datosNuevos: { estado: guardado.estado, respuestaAdmin: guardado.respuestaAdmin },
    });
    return this.obtener(id);
  }

  private consultaConRelaciones() {
    return this.repo
      .createQueryBuilder('r')
      .leftJoin('r.usuario', 'u')
      .addSelect(['u.id', 'u.nombre', 'u.correo'])
      .leftJoin('r.ruta', 'ru')
      .addSelect(['ru.id', 'ru.codigo', 'ru.nombre'])
      .leftJoin('r.embarcadero', 'e')
      .addSelect(['e.id', 'e.nombre']);
  }
}
